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
      from: env.EMAIL.FROM || env.EMAIL.USER,
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