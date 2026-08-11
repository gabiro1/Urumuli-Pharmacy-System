import * as prescriptionService from './prescription.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import { createPrescriptionSchema } from './prescription.validation.js';

function getUploadedFile(req) {
  return req?.files?.image?.[0]
    || req?.files?.file?.[0]
    || req?.file
    || null;
}

function parseMaybeJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  if (typeof value !== 'string') return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeStaffPrescriptionPayload(body, _userId) {
  const items = parseMaybeJson(body.items || body.medicines);

  const normalized = {
    patientName: body.patientName || body.patient_name || '',
    patientDob: body.patientDob || body.patient_dob || undefined,
    patientGender: body.patientGender || body.patient_gender || undefined,
    patientPhone: body.patientPhone || body.patient_phone || undefined,
    patientEmail: body.patientEmail || body.patient_email || undefined,
    patientAddress: body.patientAddress || body.patient_address || undefined,
    doctorName: body.doctorName || body.prescriberName || body.doctor_name || body.prescriber_name || '',
    doctorLicenseNumber: body.doctorLicenseNumber || body.prescriberLicense || body.doctor_license_number || undefined,
    hospitalName: body.hospitalName || body.hospital_name || undefined,
    diagnosis: body.diagnosis || undefined,
    notes: body.notes || undefined,
    urgency: body.urgency || 'NORMAL',
    expiresAt: body.expiresAt || body.expires_at || undefined,
    patientId: body.patientId || body.patient_id || null,
    items: items.map((item) => ({
      medicineName: item.medicineName || item.name,
      medicineId: item.medicineId || item.medicine_id || null,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration || undefined,
      quantity: Number(item.quantity || 1),
      notes: item.notes || undefined,
    })),
  };

  if (!normalized.patientId && body.patientPhone) {
    normalized.patientId = null;
  }

  const parsed = createPrescriptionSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      'Validation failed',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
    );
  }

  return parsed.data;
}

export async function getPrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.getPrescription(req.params.id, req.user);
    return sendSuccess(res, prescription);
  } catch (error) {
    next(error);
  }
}

export async function listPrescriptions(req, res, next) {
  try {
    const result = await prescriptionService.getAllPrescriptions(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getMyPrescriptions(req, res, next) {
  try {
    const result = await prescriptionService.getPatientPrescriptions(req.user.userId, req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function createPrescription(req, res, next) {
  try {
    const payload = {
      ...req.body,
      patientId: req.user.userId,
      items: Array.isArray(req.body.items) ? req.body.items : parseMaybeJson(req.body.items || req.body.medicines),
    };
    const prescription = await prescriptionService.createPatientPrescription(payload, req.user.userId);
    return sendCreated(res, prescription, 'Prescription submitted successfully');
  } catch (error) {
    next(error);
  }
}

export async function uploadFile(req, res, next) {
  try {
    const file = getUploadedFile(req);
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const prescription = await prescriptionService.uploadPrescriptionFile(req.params.id, file, req.user);
    return sendSuccess(res, prescription, 'File uploaded successfully');
  } catch (error) {
    next(error);
  }
}

export async function reviewPrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.reviewPrescription(
      req.params.id, req.user.userId
    );
    return sendSuccess(res, prescription, 'Prescription is now under review');
  } catch (error) {
    next(error);
  }
}

export async function approvePrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.approvePrescription(
      req.params.id, req.user.userId, req.body.pharmacistNotes
    );
    return sendSuccess(res, prescription, 'Prescription approved');
  } catch (error) {
    next(error);
  }
}

export async function rejectPrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.rejectPrescription(
      req.params.id, req.user.userId, req.body.rejectionReason
    );
    return sendSuccess(res, prescription, 'Prescription rejected');
  } catch (error) {
    next(error);
  }
}

export async function markAsCompleted(req, res, next) {
  try {
    const prescription = await prescriptionService.markAsCompleted(req.params.id, req.user.userId);
    return sendSuccess(res, prescription, 'Prescription marked as completed');
  } catch (error) {
    next(error);
  }
}

export async function createStaffPrescription(req, res, next) {
  try {
    const payload = normalizeStaffPrescriptionPayload(req.body, req.user.userId);
    const file = getUploadedFile(req);
    const prescription = await prescriptionService.createPrescription(
      {
        ...payload,
        patientId: payload.patientId || null,
        file,
      },
      req.user.userId
    );
    const result = file
      ? await prescriptionService.uploadPrescriptionFile(prescription.id, file)
      : prescription;

    return sendCreated(res, result, 'Prescription created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updatePrescriptionStatus(req, res, next) {
  try {
    const { status, pharmacistNotes, rejectionReason } = req.body;
    let result;

    if (status === 'UNDER_REVIEW') {
      result = await prescriptionService.reviewPrescription(req.params.id, req.user.userId);
    } else if (status === 'APPROVED') {
      result = await prescriptionService.approvePrescription(req.params.id, req.user.userId, pharmacistNotes || null);
    } else if (status === 'COMPLETED') {
      result = await prescriptionService.markAsCompleted(req.params.id, req.user.userId);
    } else if (status === 'REJECTED') {
      result = await prescriptionService.rejectPrescription(req.params.id, req.user.userId, rejectionReason || 'Rejected');
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported prescription status' });
    }

    return sendSuccess(res, result, 'Prescription updated');
  } catch (error) {
    next(error);
  }
}
