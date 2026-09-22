import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import * as prescriptionRepository from './prescription.repository.js';
import { transaction } from '../../config/database.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import { env } from '../../config/env.js';
import { PRESCRIPTION_STATUS } from '../../constants.js';
import { mapPrescription } from '../../utils/serializers.js';

const PRESCRIPTION_STAFF_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'PHARMACIST',
  'AUDITOR',
]);

function assertPrescriptionAccess(user, prescription, { upload = false } = {}) {
  if (!user) throw new ForbiddenError('Authentication required');

  if (user.role === 'PATIENT') {
    if (prescription.patient_id !== user.userId) {
      throw new ForbiddenError(
        upload
          ? 'You can only upload files to your own prescriptions'
          : 'You can only view your own prescriptions'
      );
    }
    return;
  }

  const allowedStaffRoles = upload
    ? ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST']
    : PRESCRIPTION_STAFF_ROLES;
  if (!allowedStaffRoles.includes(user.role)) {
    throw new ForbiddenError('You do not have permission to access this prescription');
  }
}

function identifyPrescriptionFile(file) {
  const buffer = file?.buffer;
  if (!buffer?.length) throw new ValidationError('Prescription file is empty');

  if (buffer.toString('ascii', 0, 5) === '%PDF-') {
    return { mimeType: 'application/pdf', extension: '.pdf' };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  if (['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) {
    return { mimeType: 'image/gif', extension: '.gif' };
  }

  throw new ValidationError('Unsupported prescription file. Upload a PDF, JPG, PNG, WebP, or GIF file.');
}

function resolvePrivateUploadPath(storageKey) {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const absolutePath = path.resolve(uploadRoot, storageKey);
  const relativePath = path.relative(uploadRoot, absolutePath);

  if (!relativePath || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new ValidationError('Invalid prescription storage path');
  }

  return absolutePath;
}

export async function getPrescription(id, user) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  assertPrescriptionAccess(user, prescription);

  const items = await prescriptionRepository.getPrescriptionItems(id);
  return mapPrescription(prescription, items);
}

export async function getAllPrescriptions(queryParams) {
  const pagination = parsePagination(queryParams);
  const result = await prescriptionRepository.listPrescriptions({
    ...pagination,
    status: queryParams.status,
    patientPhone: queryParams.patientPhone,
    fromDate: queryParams.fromDate,
    toDate: queryParams.toDate,
    search: queryParams.search,
    urgency: queryParams.urgency,
    pharmacist: queryParams.pharmacist,
  });

  return {
    data: result.rows.map((row) => mapPrescription(row)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pagination.limit),
    },
  };
}

export async function getPatientPrescriptions(userId, queryParams) {
  const pagination = parsePagination(queryParams);
  const result = await prescriptionRepository.listPatientPrescriptions(userId, {
    ...pagination,
    status: queryParams.status,
  });

  return {
    data: result.rows.map((row) => mapPrescription(row)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pagination.limit),
    },
  };
}

export async function createPrescription(prescriptionData, userId) {
  return transaction(async (client) => {
    const prescription = await prescriptionRepository.createPrescription(client, {
      patient_name: prescriptionData.patientName,
      patient_dob: prescriptionData.patientDob || null,
      patient_gender: prescriptionData.patientGender || null,
      patient_phone: prescriptionData.patientPhone || null,
      patient_email: prescriptionData.patientEmail || null,
      patient_address: prescriptionData.patientAddress || null,
      doctor_name: prescriptionData.doctorName,
      doctor_license_number: prescriptionData.doctorLicenseNumber || null,
      hospital_name: prescriptionData.hospitalName || null,
      diagnosis: prescriptionData.diagnosis || null,
      notes: prescriptionData.notes || null,
      uploaded_by: userId,
      patient_id: prescriptionData.patientId || null,
      expires_at: prescriptionData.expiresAt || null,
      status: PRESCRIPTION_STATUS.PENDING,
      urgency: prescriptionData.urgency || 'NORMAL',
    });

    const items = prescriptionData.items || prescriptionData.medicines || [];

    if (items.length > 0) {
      const prescriptionItems = items.map((item) => ({
        prescription_id: prescription.id,
        medicine_name: item.medicineName || item.name,
        medicine_id: item.medicineId || null,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration || null,
        quantity: item.quantity,
        notes: item.notes || null,
      }));
      await prescriptionRepository.createPrescriptionItems(client, prescriptionItems);
    }

    const createdItems = await prescriptionRepository.getPrescriptionItems(prescription.id);
    return mapPrescription(prescription, createdItems);
  });
}

export async function createPatientPrescription(prescriptionData, userId) {
  const patient = await prescriptionRepository.getPatientIdentity(userId);
  if (!patient) throw new NotFoundError('Patient', userId);

  return createPrescription({
    ...prescriptionData,
    patientId: userId,
    patientName: [patient.first_name, patient.last_name].filter(Boolean).join(' '),
    patientDob: patient.date_of_birth || undefined,
    patientGender: patient.gender || undefined,
    patientPhone: patient.phone || undefined,
    patientEmail: patient.email,
    patientAddress: patient.address || undefined,
    doctorName: prescriptionData.doctorName?.trim() || 'Not provided',
  }, userId);
}

export async function uploadPrescriptionFile(prescriptionId, file, user = null) {
  const prescription = await prescriptionRepository.findById(prescriptionId);
  if (!prescription) throw new NotFoundError('Prescription', prescriptionId);

  assertPrescriptionAccess(user, prescription, { upload: true });

  const uploadDir = path.resolve(env.UPLOAD_DIR, 'prescriptions');
  await fs.mkdir(uploadDir, { recursive: true });

  const detected = identifyPrescriptionFile(file);
  const filename = `${prescriptionId}_${crypto.randomBytes(8).toString('hex')}${detected.extension}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer, { flag: 'wx' });

  const updated = await prescriptionRepository.updateFilePath(
    prescriptionId,
    `prescriptions/${filename}`,
    detected.mimeType
  );
  const items = await prescriptionRepository.getPrescriptionItems(prescriptionId);
  return mapPrescription(updated, items);
}

export async function getPrescriptionDocument(id, user) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  assertPrescriptionAccess(user, prescription);
  if (!prescription.file_path) throw new NotFoundError('Prescription file', id);

  const absolutePath = resolvePrivateUploadPath(prescription.file_path);
  try {
    await fs.stat(absolutePath);
  } catch {
    throw new NotFoundError('Prescription file', id);
  }

  return {
    absolutePath,
    mimeType: prescription.file_type || 'application/octet-stream',
    extension: path.extname(absolutePath) || '.bin',
  };
}

export async function reviewPrescription(id, pharmacistId) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  if (prescription.status !== PRESCRIPTION_STATUS.PENDING) {
    throw new ValidationError(
      `Cannot review prescription with status '${prescription.status}'. Only PENDING prescriptions can be moved to review.`
    );
  }

  const updated = await prescriptionRepository.updateStatus(id, pharmacistId, PRESCRIPTION_STATUS.UNDER_REVIEW);
  const items = await prescriptionRepository.getPrescriptionItems(id);
  return mapPrescription(updated, items);
}

export async function approvePrescription(id, pharmacistId, notes) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  if (prescription.status !== PRESCRIPTION_STATUS.UNDER_REVIEW && prescription.status !== PRESCRIPTION_STATUS.PENDING) {
    throw new ValidationError(
      `Cannot approve prescription with status '${prescription.status}'. Only UNDER_REVIEW or PENDING prescriptions can be approved.`
    );
  }

  const updated = await prescriptionRepository.approvePrescription(id, pharmacistId, notes || null);
  const items = await prescriptionRepository.getPrescriptionItems(id);
  return mapPrescription(updated, items);
}

export async function rejectPrescription(id, pharmacistId, reason) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  if (prescription.status === PRESCRIPTION_STATUS.COMPLETED || prescription.status === PRESCRIPTION_STATUS.REJECTED) {
    throw new ValidationError(
      `Cannot reject prescription with status '${prescription.status}'.`
    );
  }

  const updated = await prescriptionRepository.rejectPrescription(id, pharmacistId, reason);
  const items = await prescriptionRepository.getPrescriptionItems(id);
  return mapPrescription(updated, items);
}

export async function markAsCompleted(id, pharmacistId) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  if (prescription.status !== PRESCRIPTION_STATUS.APPROVED) {
    throw new ValidationError(
      `Cannot complete prescription with status '${prescription.status}'. Only APPROVED prescriptions can be completed.`
    );
  }

  const updated = await prescriptionRepository.markAsCompleted(id, pharmacistId);
  const items = await prescriptionRepository.getPrescriptionItems(id);
  return mapPrescription(updated, items);
}
