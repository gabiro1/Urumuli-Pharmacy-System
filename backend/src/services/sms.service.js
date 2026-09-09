import { createNotification } from './notification.service.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const SMS_PROVIDERS = {
  africastalking: {
    baseUrl: 'https://api.africastalking.com/version1/messaging',
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM,
  },
};

function providerConfig() {
  const provider = (env.SMS_PROVIDER || process.env.SMS_PROVIDER || 'development').toLowerCase();
  return { provider, config: SMS_PROVIDERS[provider] || null };
}

async function sendViaAfricasTalking(to, message) {
  const { config } = providerConfig();
  if (!config?.apiKey || !config?.username) {
    throw new Error('Africa\'s Talking is not configured (AT_API_KEY / AT_USERNAME)');
  }

  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      apiKey: config.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      username: config.username,
      to: to,
      message: message,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Africa's Talking returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const entry = data?.SMSMessageData?.Recipients?.[0];
  return {
    success: true,
    provider: 'africastalking',
    messageId: entry?.messageId || `at_${Date.now()}`,
    cost: entry?.cost,
    status: data?.SMSMessageData?.Recipients?.[0]?.status,
  };
}

async function sendViaTwilio(to, message) {
  const { config } = providerConfig();
  if (!config?.accountSid || !config?.authToken || !config?.from) {
    throw new Error('Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: config.from,
      Body: message,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Twilio returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    success: true,
    provider: 'twilio',
    messageId: data.sid,
    status: data.status,
  };
}

export async function sendSMS({ to, message }) {
  const { provider } = providerConfig();

  if (provider === 'development' || provider === 'mock') {
    console.log(`[SMS] To: ${to} | Message: ${message}`);
    return { success: true, provider: 'mock', messageId: `sms_${Date.now()}` };
  }
  if (provider === 'africastalking') {
    return sendViaAfricasTalking(to, message);
  }
  if (provider === 'twilio') {
    return sendViaTwilio(to, message);
  }
  throw new Error(`Unknown SMS provider: ${provider}. Use development, africastalking, or twilio.`);
}

export async function sendEmail({ to, subject, body }) {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
  return { success: true, provider: 'mock', messageId: `email_${Date.now()}` };
}

export async function sendOrderStatusNotification(order, patientUserId) {
  const statusMessages = {
    READY_FOR_PICKUP: { title: 'Order Ready', message: `Your order #${order.id?.slice(0,8)} is ready for pickup.` },
    OUT_FOR_DELIVERY: { title: 'Order Out for Delivery', message: `Your order #${order.id?.slice(0,8)} is on its way!` },
    COMPLETED: { title: 'Order Completed', message: `Your order #${order.id?.slice(0,8)} has been delivered. Thank you!` },
  };
  const msg = statusMessages[order.status];
  if (!msg) return null;

  await createNotification({ userId: patientUserId, type: 'ORDER_UPDATE', ...msg, referenceType: 'ORDER', referenceId: order.id });

  const { rows } = await query('SELECT phone FROM users WHERE id = $1 AND phone IS NOT NULL', [patientUserId]);
  if (rows[0]?.phone) await sendSMS({ to: rows[0].phone, message: msg.message });

  const emailRows = await query('SELECT email FROM users WHERE id = $1', [patientUserId]);
  if (emailRows[0]?.email) await sendEmail({ to: emailRows[0].email, subject: msg.title, body: msg.message });
}

export async function sendPrescriptionUpdateNotification(prescription, patientUserId) {
  const messages = {
    APPROVED: { title: 'Prescription Approved', message: 'Your prescription has been reviewed and approved by a pharmacist.' },
    REJECTED: { title: 'Prescription Needs Attention', message: 'Your prescription needs additional information. Please check the details.' },
  };
  const msg = messages[prescription.status];
  if (!msg) return null;
  await createNotification({ userId: patientUserId, type: 'PRESCRIPTION_UPDATE', ...msg, referenceType: 'PRESCRIPTION', referenceId: prescription.id });
}

export async function sendExpiryAlertNotification(medicine, userIds) {
  for (const userId of userIds) {
    await createNotification({
      userId, type: 'EXPIRY_ALERT',
      title: `Expiry Alert: ${medicine.name}`,
      message: `Medicine ${medicine.name} is expiring on ${medicine.expiryDate}. Please review.`,
      referenceType: 'MEDICINE', referenceId: medicine.id,
    });
  }
}

export async function sendRefillReminder(patientUserId, medicineName, refillDate) {
  await createNotification({
    userId: patientUserId, type: 'REFILL_REMINDER',
    title: `Refill Reminder: ${medicineName}`,
    message: `It's time to refill ${medicineName}. Refill date: ${refillDate}`,
    referenceType: 'REFILL_REMINDER',
  });

  const { rows } = await query('SELECT phone, email FROM users WHERE id = $1', [patientUserId]);
  if (rows[0]?.phone) await sendSMS({ to: rows[0].phone, message: `Refill reminder: ${medicineName} on ${refillDate}` });
}
