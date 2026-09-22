import crypto from 'crypto';
import { transaction, query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ForbiddenError, ValidationError } from '../../utils/errors.js';
import { getPaymentProvider } from './payment.providers.js';

const sanitizePhone = (phone) => String(phone || '').replace(/[\s()-]/g, '');
const clampStatus = (status) =>
  ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status)
    ? status
    : 'PENDING';

/**
 * Create a payment attempt and ask the configured provider to collect.
 * The order's state machine is advanced by orders.service.startPayment, which
 * owns the transition, after this function returns.
 */
export async function initiatePayment({ order, _user, idempotencyKey, method }) {
  if (!idempotencyKey) throw new ValidationError('Idempotency-Key header is required');
  const provider = getPaymentProvider();

  return transaction(async (client) => {
    const prior = (
      await client.query(
        `SELECT response_body FROM idempotency_records
         WHERE scope='START_PAYMENT' AND idempotency_key=$1 AND owner_key=$2`,
        [idempotencyKey, order.patient_identity_id]
      )
    ).rows[0];
    if (prior) return prior.response_body;

    const attemptId = crypto.randomUUID();
    const insert = await client.query(
      `INSERT INTO payment_attempts(id, order_id, idempotency_key, provider, amount, currency, status, provider_response)
       VALUES($1,$2,$3,$4,$5,$6,'PENDING','{}'::jsonb) RETURNING *`,
      [attemptId, order.id, idempotencyKey, provider.name, order.total, env.PAYMENT_CURRENCY || 'RWF']
    );
    const attempt = insert.rows[0];

    // Talk to the provider outside the DB transaction - the network call must
    // not hold a row lock open for minutes at a time.
    const requested = await provider.requestPayment({
      amount: order.total,
      currency: env.PAYMENT_CURRENCY || 'RWF',
      externalId: order.public_reference,
      method,
      phone: sanitizePhone(order.patient_phone),
      partyNumber: sanitizePhone(order.patient_phone),
      partyHolder: order.patient_name,
    });

    const status = clampStatus(requested.status || 'PENDING');
    const updated = (
      await client.query(
        `UPDATE payment_attempts SET status=$1, provider_reference=$2, provider_response=$3::jsonb
         WHERE id=$4 RETURNING *`,
        [status, requested.providerReference || null, JSON.stringify({ ...requested, requestedAt: new Date().toISOString() }), attempt.id]
      )
    ).rows[0];

    const result = {
      provider: provider.name,
      providerReference: updated.provider_reference,
      attemptId: updated.id,
      status,
      simulated: Boolean(requested.simulated),
    };
    await client.query(
      `INSERT INTO idempotency_records(scope, idempotency_key, owner_key, response_status, response_body)
       VALUES('START_PAYMENT',$1,$2,200,$3)`,
      [idempotencyKey, order.patient_identity_id, result]
    );
    return { attempt: updated, providerStatus: status, simulated: Boolean(requested.simulated) };
  });
}

/**
 * Verify a provider webhook and record the outcome on the matching attempt.
 * Returns `{ matched: false }` when the reference is unknown so callers can
 * respond 404/ignored without failing loudly.
 */
export async function recordPaymentWebhook(providerName, rawBody, headers) {
  const provider = getPaymentProvider();
  const adapter = provider.name === providerName ? provider : null;
  if (!adapter || !adapter.verifyWebhook || !adapter.verifyWebhook(rawBody, headers)) {
    throw new ForbiddenError('Invalid webhook signature');
  }

  let parsed;
  try {
    parsed = adapter.parseWebhook(JSON.parse(rawBody));
  } catch {
    throw new ValidationError('Invalid webhook payload');
  }
  if (!parsed || !parsed.providerReference) throw new ValidationError('Webhook payload missing provider reference');

  const attempt = (
    await query('SELECT * FROM payment_attempts WHERE provider=$1 AND provider_reference=$2', [
      adapter.name,
      parsed.providerReference,
    ])
  ).rows[0];
  if (!attempt) return { matched: false };

  const status = clampStatus(parsed.status || 'PENDING');
  if (!['SUCCEEDED', 'FAILED', 'REFUNDED'].includes(attempt.status)) {
    await query(
      `UPDATE payment_attempts SET status=$1, provider_response=provider_response || $3::jsonb
       WHERE id=$2`,
      [status, attempt.id, JSON.stringify({ webhook: parsed.providerData, receivedAt: new Date().toISOString() })]
    );
  }
  return { matched: true, status, attempt };
}

/**
 * Sandbox providers settle a few seconds after initiation. We resolve in
 * process (a 5s setTimeout) so the whole demo flow - initiate, process,
 * receive - works without Redis or a polling worker. `onSettled` is injected
 * by the caller to avoid import cycles with the orders module.
 */
export function scheduleSandboxSettlement(attempt, onSettled) {
  const provider = getPaymentProvider();
  if (!['sandbox'].includes(provider.name)) return;
  if (attempt.status === 'SUCCEEDED') {
    onSettled({ attemptId: attempt.id });
    return;
  }
  if (attempt.status !== 'PENDING') return;

  const ms = Number.isFinite(Number(env.PAYMENT_SANDBOX_DELAY_MS))
    ? Number(env.PAYMENT_SANDBOX_DELAY_MS)
    : 5000;
  const timer = setTimeout(() => onSettled({ attemptId: attempt.id }), ms);
  timer.unref?.();
}

export async function getAttempts(orderId) {
  const { rows } = await query(
    'SELECT id, provider, provider_reference, amount, currency, status, created_at, updated_at FROM payment_attempts WHERE order_id=$1 ORDER BY created_at DESC',
    [orderId]
  );
  return rows;
}

export function assertPaymentBlockedStatus(orderStatus) {
  if (orderStatus === 'PAYMENT_PROCESSING' || orderStatus === 'PAYMENT_RECEIVED') {
    throw new ValidationError('A payment for this order is already being processed');
  }
  return true;
}