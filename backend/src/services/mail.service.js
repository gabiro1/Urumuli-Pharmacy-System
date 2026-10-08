import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!env.EMAIL.USER || !env.EMAIL.APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.EMAIL.USER,
        pass: env.EMAIL.APP_PASSWORD,
      },
    });
  }
  return transporter;
}

function plainTextFromHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[mail] SMTP not configured. Skipped sending "${subject}" to ${to}.`);
    return { skipped: true, to };
  }

  try {
    await transport.sendMail({
      from: env.EMAIL.FROM || `Urumuli Pharmacy <${env.EMAIL.USER}>`,
      to,
      subject,
      html,
      text: text || plainTextFromHtml(html),
    });
    return { sent: true, to };
  } catch (error) {
    console.error(`[mail] Failed to send "${subject}" to ${to}:`, error.message);
    return { failed: true, reason: error.message };
  }
}

export async function sendVerificationEmail({ to, name, verificationUrl }) {
  const displayName = name || 'there';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
      <h2 style="margin:0 0 16px;">Verify your email address</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${displayName},<br/>
        Welcome to Urumuli Pharmacy System. Please confirm your email address to activate
        your patient account by clicking the button below. This link expires in 24 hours.
      </p>
      <a href="${verificationUrl}"
         style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Verify my email
      </a>
      <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#6b7280;">
        If the button does not work, copy and paste this link into your browser:<br/>
        <span style="word-break:break-all;">${verificationUrl}</span>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Urumuli Pharmacy System — Verify your email',
    html,
  });
}

function prettifyRole(role) {
  if (!role) return 'Team member';
  return String(role)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendInvitationEmail({ to, name, role, inviteUrl, expiresAt }) {
  const displayName = name || 'there';
  const roleLabel = prettifyRole(role);
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
    : '48 hours';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
      <h2 style="margin:0 0 16px;">You have been invited to join the team</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${displayName},<br/>
        An administrator of Urumuli Pharmacy System has invited you to create an account
        as a <strong>${roleLabel}</strong>. Accept the invitation and choose your own
        password to finish setting up your account. This link expires on ${expiresLabel}.
      </p>
      <a href="${inviteUrl}"
         style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Accept invitation
      </a>
      <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#6b7280;">
        If the button does not work, copy and paste this link into your browser:<br/>
        <span style="word-break:break-all;">${inviteUrl}</span>
      </p>
      <p style="font-size:13px;line-height:1.6;margin:16px 0 0;color:#6b7280;">
        This invitation was sent to ${to} because an administrator invited you to
        create an account. If you were not expecting it, you can ignore this email
        and no account will be created.
      </p>
      <p style="font-size:13px;line-height:1.6;margin:16px 0 0;color:#6b7280;">
        Urumuli Pharmacy System &middot; Kigali, Rwanda
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Invitation to join Urumuli Pharmacy System',
    html,
    text: [
      `Hi ${displayName},`,
      '',
      `An administrator has invited you to create an account on Urumuli Pharmacy System as a ${roleLabel}.`,
      `Accept it here and choose your own password: ${inviteUrl}`,
      `This link expires on ${expiresLabel}. If it has expired, ask your administrator to send a new one.`,
      '',
      `If you were not expecting this invitation, ignore this email and no account will be created.`,
      `Sent to ${to}.`,
    ].join('\n'),
  });
}