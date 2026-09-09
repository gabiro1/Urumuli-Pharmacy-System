import * as repository from './consent.repository.js';
import { ValidationError } from '../../utils/errors.js';

const VALID_CONSENT_TYPES = [
  'DATA_SHARING', 'PRESCRIPTION_STORAGE', 'CHAT_RECORDING',
  'MARKETING_EMAILS', 'SMS_NOTIFICATIONS', 'ANONYMOUS_DATA_RESEARCH',
  'INSURANCE_DATA_SHARING', 'TELEHEALTH_CONSENT'
];

export async function getConsents(patientId) {
  return repository.getConsents(patientId);
}

export async function updateConsent(patientId, consentType, granted, ip, ua) {
  if (!VALID_CONSENT_TYPES.includes(consentType)) {
    throw new ValidationError(`Invalid consent type: ${consentType}`);
  }
  return repository.upsertConsent({ patientId, consentType, granted, ipAddress: ip, userAgent: ua });
}

export async function hasConsent(patientId, consentType) {
  return repository.hasConsent(patientId, consentType);
}

export async function bulkUpdate(patientId, consents, ip, ua) {
  const results = [];
  for (const { consentType, granted } of consents) {
    const result = await updateConsent(patientId, consentType, granted, ip, ua);
    results.push(result);
  }
  return results;
}
