import crypto from 'crypto';
import { env } from '../../config/env.js';

/**
 * Provider abstraction for collecting money. Each adapter implements:
 *   name()              -> provider identifier stored on the payment attempt
 *   supportedMethods()  -> ['MOBILE_MONEY', 'CARD'] in whatever combination the adapter accepts
 *   requestPayment(opts)-> { providerReference, status } where status is
 *                          'PENDING' | 'SUCCEEDED' | 'FAILED'
 *   parseWebhook(body)  -> { providerReference, status, providerData }
 *   verifyWebhook(raw, headers) -> boolean
 *
 * Payment lifecycle lives in payment.service.js; adapters only talk to the
 * external processor. The `development` provider is the safe default and never
 * charges anyone.
 */

function hmac(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function verifySharedSecret(rawBody, headers, secretNames = ['x-urumuli-signature']) {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    // Without a configured secret we refuse to trust unsigned webhooks.
    return false;
  }
  const expected = hmac(rawBody, secret);
  const provided = headers[secretNames.find((name) => headers[name])] || '';
  return typeof provided === 'string' && expected === provided.trim().toLowerCase();
}

const sandboxReference = (prefix) =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const developmentAdapter = {
  name: 'development',
  supportedMethods: () => [],
  requestPayment: async () => ({
    providerReference: null,
    status: 'FAILED',
    skipped: true,
  }),
  parseWebhook: () => null,
  verifyWebhook: () => false,
};

const sandboxAdapter = {
  name: 'sandbox',
  supportedMethods: () => ['MOBILE_MONEY', 'CARD'],
  requestPayment: async ({ method }) => {
    // Card is approved instantly in the sandbox; mobile money is settled a few
    // seconds later by the in-process scheduler in payment.service.js so a demo
    // can show the full lifecycle without a real provider.
    return {
      providerReference: sandboxReference('SBX'),
      status: method === 'CARD' ? 'SUCCEEDED' : 'PENDING',
      simulated: true,
    };
  },
  parseWebhook: (body) => {
    if (!body || typeof body.provider_reference !== 'string') return null;
    return {
      providerReference: body.provider_reference,
      status: body.status === 'SUCCEEDED' || body.status === 'SUCCESSFUL' ? 'SUCCEEDED'
        : body.status === 'FAILED' ? 'FAILED' : 'PENDING',
      providerData: body,
    };
  },
  verifyWebhook: (rawBody, headers) => verifySharedSecret(rawBody, headers),
};

const mtnMomoAdapter = {
  name: 'mtn-momo',
  supportedMethods: () => ['MOBILE_MONEY'],
  async requestPayment({ amount, currency, externalId, partyNumber, partyHolder }) {
    const host = env.PAYMENT_MTN_MOMO_HOST || 'https://sandbox.momodeveloper.mtn.com';
    const referenceId = crypto.randomUUID();
    const body = {
      amount: String(amount),
      currency: currency || env.PAYMENT_CURRENCY || 'RWF',
      externalId: externalId.slice(0, 64),
      payer: { partyIdType: 'MSISDN', partyId: String(partyNumber), partyHolder },
      payerMessage: 'Urumuli Pharmacy',
      payeeNote: `Urumuli order ${externalId}`,
    };
    const res = await fetch(`${host}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Reference-Id': referenceId,
        'X-Target-Environment': env.PAYMENT_MTN_MOMO_ENVIRONMENT || 'sandbox',
        'Ocp-Apim-Subscription-Key': env.PAYMENT_MTN_MOMO_SUBSCRIPTION_KEY || '',
        Authorization: `Basic ${Buffer.from(
          `${env.PAYMENT_MTN_MOMO_API_USER || ''}:${env.PAYMENT_MTN_MOMO_API_KEY || ''}`
        ).toString('base64')}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`MTN MoMo request failed (${res.status}) ${detail}`);
    }
    // 202 Accepted means the collection request was queued by MTN.
    return { providerReference: referenceId, status: 'PENDING' };
  },
  parseWebhook: (body) => {
    if (!body || !body.referenceId) return null;
    const status = body.status === 'SUCCESSFUL' ? 'SUCCEEDED'
      : body.status === 'FAILED' || body.status === 'REJECTED' ? 'FAILED' : 'PENDING';
    return { providerReference: body.referenceId, status, providerData: body };
  },
  verifyWebhook: (rawBody, headers) => verifySharedSecret(rawBody, headers),
};

const airtelMoneyAdapter = {
  name: 'airtel-money',
  supportedMethods: () => ['MOBILE_MONEY'],
  async requestPayment({ amount, externalId, partyNumber }) {
    const host = env.PAYMENT_AIRTEL_HOST || 'https://openapi.airtel.africa';
    const token = await obtainAirtelToken(host);
    const country = env.PAYMENT_AIRTEL_COUNTRY || 'RW';
    const currency = 'RWF';
    const res = await fetch(`${host}/merchant/v2/payments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Country': country,
        'X-Currency': currency,
      },
      body: JSON.stringify({
        reference: externalId,
        subscriber: {
          country,
          currency,
          msisdn: String(partyNumber),
        },
        transaction: { amount: String(amount), country, currency },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Airtel Money request failed (${res.status}) ${detail}`);
    }
    const data = await res.json();
    return {
      providerReference: data.transaction?.id || data.airtel_money_id || sandboxReference('AIRTEL'),
      status: 'PENDING',
    };
  },
  parseWebhook: (body) => {
    if (!body || (!body.id && !body.reference)) return null;
    const status = body.status === 'SUCCESS' || body.status === 'SUCCESSFUL' ? 'SUCCEEDED'
      : body.status === 'FAILED' || body.status === 'REJECTED' ? 'FAILED' : 'PENDING';
    return {
      providerReference: body.id || body.reference,
      status,
      providerData: body,
    };
  },
  verifyWebhook: (rawBody, headers) => verifySharedSecret(rawBody, headers),
};

async function obtainAirtelToken(host) {
  const res = await fetch(`${host}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.PAYMENT_AIRTEL_APP_ID || '',
      client_secret: env.PAYMENT_AIRTEL_APP_KEY || '',
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Airtel token request failed (${res.status})`);
  const data = await res.json();
  return data.access_token || '';
}

const cardAdapter = {
  name: 'card',
  supportedMethods: () => ['CARD'],
  async requestPayment({ amount, currency, externalId }) {
    // Until a card processor is configured (Stripe/GPO/other) the demo behaves
    // like the sandbox and approves instantly without charging a card.
    if (!env.PAYMENT_CARD_PROCESSING_URL) {
      return { providerReference: sandboxReference('CARD'), status: 'SUCCEEDED', simulated: true };
    }
    const res = await fetch(env.PAYMENT_CARD_PROCESSING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.PAYMENT_CARD_SECRET_KEY || ''}`,
      },
      body: JSON.stringify({ amount, currency, externalId }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Card processing failed (${res.status})`);
    const data = await res.json();
    return { providerReference: data.id || externalId, status: data.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING' };
  },
  parseWebhook: (body) => {
    if (!body || (!body.id && !body.provider_reference)) return null;
    const status = body.status === 'succeeded' || body.status === 'SUCCEEDED' ? 'SUCCEEDED'
      : body.status === 'failed' || body.status === 'FAILED' ? 'FAILED' : 'PENDING';
    return { providerReference: body.id || body.provider_reference, status, providerData: body };
  },
  verifyWebhook: (rawBody, headers) => verifySharedSecret(rawBody, headers),
};

const adapters = {
  development: developmentAdapter,
  sandbox: sandboxAdapter,
  'mtn-momo': mtnMomoAdapter,
  'airtel-money': airtelMoneyAdapter,
  card: cardAdapter,
};

export function getPaymentProvider() {
  return adapters[env.PAYMENT_PROVIDER] || developmentAdapter;
}

export function isProviderConfigured() {
  const provider = getPaymentProvider();
  if (provider.name === 'development') return { configured: false, methods: [] };
  return { configured: true, methods: provider.supportedMethods() };
}