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

export async function getPrescription(id, user) {
  const prescription = await prescriptionRepository.findById(id);
  if (!prescription) throw new NotFoundError('Prescription', id);

  if (user.role === 'PATIENT' && prescription.patient_id !== user.userId) {
    throw new ForbiddenError('You can only view your own prescriptions');
  }

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

  if (user?.role === 'PATIENT' && prescription.patient_id !== user.userId) {
    throw new ForbiddenError('You can only upload files to your own prescriptions');
  }

  const uploadDir = path.resolve(env.UPLOAD_DIR, 'prescriptions');
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.originalname);
  const filename = `${prescriptionId}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer);

  const updated = await prescriptionRepository.updateFilePath(
    prescriptionId,
    `prescriptions/${filename}`,
    file.mimetype
  );
  const items = await prescriptionRepository.getPrescriptionItems(prescriptionId);
  return mapPrescription(updated, items);
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
