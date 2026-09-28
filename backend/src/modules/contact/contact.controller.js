import * as contactRepository from './contact.repository.js';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { sendEmail } from '../../services/mail.service.js';

function replyEmailHtml({ name, subject, original, body }) {
  const heading = subject ? `Re: ${subject}` : 'Reply from Urumuli Pharmacy';
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h2 style="margin:0 0 6px;color:#16a34a;">Urumuli Pharmacy</h2>
      <p style="font-size:14px;margin:0 0 20px;color:#6b7280;">${heading}</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Dear ${name || 'there'},</p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;white-space:pre-line;">${body}</p>
      </div>
      <div style="border-left:3px solid #e5e7eb;padding:4px 14px;margin:0 0 24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Your original message:</p>
        <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${original}</p>
      </div>
      <p style="font-size:13px;line-height:1.6;margin:0;color:#6b7280;">
        If you need further help, just reply to this email or visit us at the pharmacy.
      </p>
    </div>
  `;
}

export async function createMessage(req, res, next) {
  try {
    const message = await contactRepository.createMessage(req.body);
    return sendCreated(res, message, 'Message received successfully');
  } catch (error) {
    next(error);
  }
}

export async function listMessages(req, res, next) {
  try {
    const { status, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = (page - 1) * limit;
    const { rows, total } = await contactRepository.listMessages({ status, search, limit, offset });
    return sendPaginated(res, rows, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessage(req, res, next) {
  try {
    const message = await contactRepository.findMessageById(req.params.id);
    if (!message) throw new NotFoundError('Message', req.params.id);
    return sendSuccess(res, message);
  } catch (error) {
    next(error);
  }
}

export async function updateMessageStatus(req, res, next) {
  try {
    const status = String(req.body.status || '').toUpperCase();
    const allowed = ['NEW', 'READ', 'RESOLVED'];
    if (!allowed.includes(status)) {
      throw new ValidationError(`Status must be one of: ${allowed.join(', ')}`);
    }
    const message = await contactRepository.updateMessageStatus(req.params.id, status);
    if (!message) throw new NotFoundError('Message', req.params.id);
    return sendSuccess(res, message, `Message marked as ${status}`);
  } catch (error) {
    next(error);
  }
}

export async function replyMessage(req, res, next) {
  try {
    const id = req.params.id;
    const message = await contactRepository.findMessageById(id);
    if (!message) throw new NotFoundError('Message', id);

    const body = String(req.body.body || '').trim();
    if (!body) throw new ValidationError('Reply body is required');

    const updated = await contactRepository.createReply({
      messageId: id,
      body,
      staffEmail: req.user?.email,
      staffRole: req.user?.role,
    });

    const subject = message.subject ? `Re: ${message.subject}` : 'Reply from Urumuli Pharmacy';
    const mail = await sendEmail({
      to: message.email,
      subject,
      html: replyEmailHtml({ name: message.name, subject: message.subject, original: message.message, body }),
    });

    const note = mail.sent
      ? 'Reply sent and message resolved'
      : mail.skipped
        ? 'Reply recorded (email not configured — SMTP skipped)'
        : 'Reply recorded but the email could not be sent';

    return sendSuccess(res, updated, note);
  } catch (error) {
    next(error);
  }
}
