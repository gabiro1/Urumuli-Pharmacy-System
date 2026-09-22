import * as availabilityRepository from './availability.repository.js';
import * as chatRepository from '../chat/chat.repository.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { createNotification } from '../../services/notification.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { AVAILABILITY_STATUS, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';
import { invalidateMedicineCache } from '../../services/redis.service.js';
import { mapConversation } from '../../utils/serializers.js';

const PHARMACIST_DISPLAY_NAME = 'Urumuli pharmacist';

function fullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function mapPatientConversation(conversation) {
  const mapped = mapConversation(conversation);
  if (!mapped) return null;

  return {
    ...mapped,
    pharmacistName: PHARMACIST_DISPLAY_NAME,
    pharmacistFirstName: null,
    pharmacistLastName: null,
  };
}

export function mapAvailabilityRequest(request, { hidePharmacistIdentity = false } = {}) {
  if (!request) return null;

  return {
    id: request.id,
    conversationId: request.conversation_id || null,
    patientId: request.patient_id || null,
    medicineId: request.medicine_id || null,
    medicineName: request.medicine_name || null,
    medicineCatalogName: request.medicine_catalog_name || null,
    sellingUnit: request.medicine_selling_unit || 'unit',
    searchedTerm: request.searched_term || null,
    systemStock: Number(request.system_stock || 0),
    verificationStatus: request.verification_status || AVAILABILITY_STATUS.PENDING,
    physicalStockConfirmed: request.physical_stock_confirmed === null || request.physical_stock_confirmed === undefined
      ? null
      : Number(request.physical_stock_confirmed),
    pharmacistId: request.pharmacist_id || null,
    pharmacistNotes: request.pharmacist_notes || null,
    quotedUnitPrice: request.quoted_unit_price === null || request.quoted_unit_price === undefined
      ? null
      : Number(request.quoted_unit_price),
    catalogPrice: request.medicine_catalog_price === null || request.medicine_catalog_price === undefined
      ? null
      : Number(request.medicine_catalog_price),
    orderId: request.order_id || null,
    pharmacistName: hidePharmacistIdentity
      ? (request.pharmacist_id ? PHARMACIST_DISPLAY_NAME : null)
      : fullName(request.pharmacist_first_name, request.pharmacist_last_name) || null,
    patientName: fullName(request.patient_first_name, request.patient_last_name) || 'Patient',
    patientEmail: request.patient_email || null,
    verifiedAt: request.verified_at || null,
    inventorySyncedAt: request.inventory_synced_at || null,
    createdAt: request.created_at || null,
    updatedAt: request.updated_at || null,
  };
}

function buildFirstMessage(data) {
  const lines = [
    `Hello, I am looking for ${data.medicineName}. It is not showing as available in the system. Could you please check if it is physically available at the pharmacy?`,
  ];
  if (data.message && data.message.trim()) {
    lines.push('', data.message.trim());
  }
  return lines.join('\n');
}

function buildSubject(medicineName) {
  return `Medicine availability check: ${medicineName}`;
}

export async function createAvailabilityRequest(patientId, data, ipAddress, userAgent) {
  let medicineSnapshot = null;
  if (data.medicineId) {
    medicineSnapshot = await availabilityRepository.findMedicineSnapshot(data.medicineId);
    if (!medicineSnapshot) throw new NotFoundError('Medicine', data.medicineId);
  }

  const medicineName = String(data.medicineName || medicineSnapshot?.name || '').trim();
  if (!medicineName) throw new ValidationError('Medicine name is required');

  const systemStock = medicineSnapshot ? Number(medicineSnapshot.current_stock || 0) : 0;

  const { conversationId, request } = await availabilityRepository.createRequest({
    patientId,
    medicineId: data.medicineId || medicineSnapshot?.id || null,
    medicineName,
    searchedTerm: data.searchedTerm || null,
    systemStock,
    subject: buildSubject(medicineName),
    message: buildFirstMessage({ ...data, medicineName }),
  });

  await createAuditLog({
    userId: patientId,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.AVAILABILITY_REQUEST,
    entityId: request.id,
    description: `Availability request created for ${medicineName}`,
    metadata: { conversationId, medicineId: data.medicineId || null, systemStock },
    ipAddress,
    userAgent,
  });

  // Ping the pharmacy staff that can act on this request using the existing
  // notification architecture. The care inbox is polled live as a fallback.
  const staff = await availabilityRepository.listStaffToNotify();
  const patientName = await getPatientName(patientId);
  await Promise.all(
    staff.map((row) =>
      createNotification({
        userId: row.id,
        type: 'AVAILABILITY_REQUEST',
        title: 'New Availability Request',
        message: `${medicineName}\nCustomer: ${patientName}\nDigital stock: ${systemStock}`,
        referenceType: 'CONVERSATION',
        referenceId: conversationId,
      })
    )
  );

  const conversation = await chatRepository.findConversationById(conversationId);

  return {
    request: mapAvailabilityRequest(request, { hidePharmacistIdentity: true }),
    conversation: mapPatientConversation(conversation),
    conversationId,
  };
}

async function getPatientName(userId) {
  const row = await availabilityRepository.findUserName(userId);
  return row ? fullName(row.first_name, row.last_name) || 'a patient' : 'a patient';
}

export async function listMyRequests(patientId) {
  const rows = await availabilityRepository.listPatientRequests(patientId);
  return rows.map((request) => mapAvailabilityRequest(request, { hidePharmacistIdentity: true }));
}

export async function getRequestByConversation(conversationId, userId, userRole) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');

  if (userRole === 'PATIENT' && conversation.patient_id !== userId) {
    throw new ForbiddenError('You can only access your own conversations');
  }

  const request = await availabilityRepository.findRequestByConversationId(conversationId);
  return mapAvailabilityRequest(request, { hidePharmacistIdentity: userRole === 'PATIENT' });
}

export async function getRequest(requestId, userId, userRole) {
  const request = await availabilityRepository.findRequestById(requestId);
  if (!request) throw new NotFoundError('Availability request not found');

  if (userRole === 'PATIENT' && request.patient_id !== userId) {
    throw new ForbiddenError('You can only access your own availability requests');
  }

  return mapAvailabilityRequest(request, { hidePharmacistIdentity: userRole === 'PATIENT' });
}

function senderRoleFor(role) {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'PHARMACIST') return 'PHARMACIST';
  return 'PHARMACIST';
}

export async function verifyRequest(requestId, data, actor, ipAddress, userAgent) {
  const request = await availabilityRepository.findRequestById(requestId);
  if (!request) throw new NotFoundError('Availability request not found');

  const status = data.status;
  const physicalStock = data.physicalStockConfirmed === null || data.physicalStockConfirmed === undefined
    ? null
    : Math.max(0, Math.round(Number(data.physicalStockConfirmed) || 0));

  const catalogPrice = request.medicine_catalog_price === null || request.medicine_catalog_price === undefined
    ? null
    : Number(request.medicine_catalog_price);
  const quotedUnitPrice = status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE
    ? (data.unitPrice === null || data.unitPrice === undefined ? catalogPrice : Number(data.unitPrice))
    : null;

  if (status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE && (!Number.isFinite(quotedUnitPrice) || quotedUnitPrice < 0)) {
    throw new ValidationError('A price per unit is required before the patient can place an order');
  }

  const updated = await availabilityRepository.updateVerification(requestId, {
    verificationStatus: status,
    physicalStockConfirmed: status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE ? physicalStock : null,
    pharmacistId: actor.userId,
    notes: data.notes || null,
    quotedUnitPrice,
  });

  const priceMessage = quotedUnitPrice === null ? '' : ` The price is RWF ${quotedUnitPrice.toLocaleString()} per ${request.medicine_selling_unit || 'unit'}.`;
  const confirmationMessage = status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE
    ? `Yes, we currently have ${request.medicine_name} physically available at the pharmacy${physicalStock ? ` (${physicalStock} in stock)` : ''}.${priceMessage} You can continue to place an order from this conversation.`
    : `Sorry, we also checked the physical pharmacy and currently don't have ${request.medicine_name}.`;

  const message = await chatRepository.createMessage({
    conversationId: request.conversation_id,
    senderId: actor.userId,
    senderRole: senderRoleFor(actor.role),
    content: confirmationMessage,
  });

  await chatRepository.updateConversationStatus(request.conversation_id, 'WAITING_PATIENT', actor.userId);
  await chatRepository.addConversationEvent({
    conversationId: request.conversation_id,
    eventType: 'STATUS_CHANGED',
    actorId: actor.userId,
    newValue: status,
    description: `Availability verified: ${status}`,
  });

  await createAuditLog({
    userId: actor.userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.AVAILABILITY_REQUEST,
    entityId: requestId,
    description: `Availability verified as ${status} for ${request.medicine_name}`,
    metadata: { physicalStockConfirmed: physicalStock, conversationId: request.conversation_id },
    ipAddress,
    userAgent,
  });

  await createNotification({
    userId: request.patient_id,
    type: 'PHARMACIST_RESPONSE',
    title: status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE ? 'Medicine physically available' : 'Medicine not physically available',
    message: confirmationMessage,
    referenceType: 'CONVERSATION',
    referenceId: request.conversation_id,
  });

  return { request: mapAvailabilityRequest(updated), message: mapMessageShape(message) };
}

export async function syncInventoryFromVerification(requestId, data, actor, ipAddress, userAgent) {
  const request = await availabilityRepository.findRequestById(requestId);
  if (!request) throw new NotFoundError('Availability request not found');

  const result = await availabilityRepository.syncInventoryFromVerification(requestId, {
    physicalStock: data.physicalStock,
    pharmacistId: actor.userId,
  });

  await invalidateMedicineCache();

  const auditMetadata = result.updated
    ? {
        previousStock: result.movement.previous_stock,
        newStock: result.movement.new_stock,
        reference: `VERIFICATION:${requestId}`,
      }
    : { updated: false, reason: 'Live stock already matched the confirmed quantity' };

  await createAuditLog({
    userId: actor.userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.INVENTORY,
    entityId: request.medicine_id,
    description: `Inventory synchronised from physical verification of ${request.medicine_name}`,
    metadata: auditMetadata,
    ipAddress,
    userAgent,
  });

  await chatRepository.addConversationEvent({
    conversationId: request.conversation_id,
    eventType: 'STATUS_CHANGED',
    actorId: actor.userId,
    newValue: AVAILABILITY_STATUS.INVENTORY_UPDATED,
    description: 'Digital inventory updated from physical verification',
  });

  const message = await chatRepository.createMessage({
    conversationId: request.conversation_id,
    senderId: actor.userId,
    senderRole: senderRoleFor(actor.role),
    content: result.updated
      ? `I have updated our digital inventory to ${result.movement.new_stock} units for ${request.medicine_name}.`
      : `Our digital inventory for ${request.medicine_name} is now in sync with the physical pharmacy.`,
  });

  return {
    request: mapAvailabilityRequest(result.request),
    movement: result.movement,
    message: mapMessageShape(message),
  };
}

function mapMessageShape(message) {
  return message
    ? {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderRole: message.sender_role,
        content: message.content,
        createdAt: message.created_at || null,
      }
    : null;
}
