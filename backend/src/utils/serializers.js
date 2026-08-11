function fullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function mapUser(user) {
  if (!user) return null;

  const name = fullName(user.first_name, user.last_name);

  return {
    id: user.id,
    email: user.email,
    name,
    fullName: name,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone || null,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at || null,
    emailVerifiedAt: user.email_verified_at || null,
    passwordChangedAt: user.password_changed_at || null,
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null,
    avatar: user.avatar || null,
  };
}

export function mapUserSummary(user) {
  const mapped = mapUser(user);
  if (!mapped) return null;

  return {
    id: mapped.id,
    email: mapped.email,
    name: mapped.name,
    fullName: mapped.fullName,
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    role: mapped.role,
    isActive: mapped.isActive,
    lastLoginAt: mapped.lastLoginAt,
    phone: mapped.phone,
    avatar: mapped.avatar,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  };
}

export function mapRole(role) {
  if (!role) return null;
  return {
    ...role,
    permissions: parseJson(role.permissions) || role.permissions || [],
  };
}

export function normalizePrescriptionStatus(status) {
  if (status === 'DISPENSED') return 'COMPLETED';
  return status;
}

export function mapPrescriptionItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    prescriptionId: item.prescription_id,
    medicineName: item.medicine_name,
    medicineId: item.medicine_id,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    quantity: item.quantity,
    notes: item.notes,
    createdAt: item.created_at || null,
  };
}

export function buildPrescriptionStatusHistory(prescription) {
  if (!prescription) return [];

  const status = normalizePrescriptionStatus(prescription.status);
  const history = [
    {
      status: 'PENDING',
      by: prescription.uploadedByName || 'System',
      timestamp: prescription.createdAt || null,
      note: 'Prescription submitted',
    },
  ];

  if (prescription.status === 'UNDER_REVIEW' || prescription.approvedAt || prescription.rejectedAt || prescription.completedAt) {
    history.push({
      status: 'UNDER_REVIEW',
      by: prescription.pharmacistName || 'Pharmacist',
      timestamp: prescription.updatedAt || prescription.createdAt || null,
      note: 'Prescription reviewed',
    });
  }

  if (status === 'APPROVED' || prescription.approvedAt || prescription.completedAt) {
    history.push({
      status: 'APPROVED',
      by: prescription.pharmacistName || 'Pharmacist',
      timestamp: prescription.approvedAt || null,
      note: prescription.pharmacistNotes || 'Prescription approved',
    });
  }

  if (status === 'COMPLETED' || prescription.completedAt) {
    history.push({
      status: 'COMPLETED',
      by: prescription.pharmacistName || 'Pharmacist',
      timestamp: prescription.completedAt || prescription.updatedAt || null,
      note: 'Prescription completed',
    });
  }

  if (status === 'REJECTED' || prescription.rejectedAt) {
    history.push({
      status: 'REJECTED',
      by: prescription.pharmacistName || 'Pharmacist',
      timestamp: prescription.rejectedAt || prescription.updatedAt || null,
      note: prescription.rejectionReason || 'Prescription rejected',
    });
  }

  return history.filter((entry, index, array) => {
    if (!entry.timestamp) return false;
    return array.findIndex((item) => item.status === entry.status) === index;
  });
}

export function mapPrescription(prescription, items = []) {
  if (!prescription) return null;

  const normalizedStatus = normalizePrescriptionStatus(prescription.status);
  const mappedItems = items.map(mapPrescriptionItem).filter(Boolean);

  const mapped = {
    id: prescription.id,
    prescriptionId: prescription.id?.slice(-8)?.toUpperCase() || null,
    patientId: prescription.patient_id || null,
    patientName: prescription.patient_name,
    patientDob: prescription.patient_dob || null,
    patientGender: prescription.patient_gender || null,
    patientPhone: prescription.patient_phone || null,
    patientEmail: prescription.patient_email || null,
    patientAddress: prescription.patient_address || null,
    doctorName: prescription.doctor_name,
    prescriberName: prescription.doctor_name,
    doctorLicenseNumber: prescription.doctor_license_number || null,
    hospitalName: prescription.hospital_name || null,
    diagnosis: prescription.diagnosis || null,
    notes: prescription.notes || null,
    urgency: prescription.urgency || 'NORMAL',
    filePath: prescription.file_path || null,
    fileUrl: prescription.file_path ? `/uploads/${prescription.file_path}` : null,
    fileType: prescription.file_type || null,
    pharmacistId: prescription.pharmacist_id || null,
    pharmacistName: prescription.pharmacist_name || null,
    pharmacistNotes: prescription.pharmacist_notes || null,
    approvedAt: prescription.approved_at || null,
    rejectedAt: prescription.rejected_at || null,
    rejectionReason: prescription.rejection_reason || null,
    completedAt: prescription.completed_at || null,
    uploadedBy: prescription.uploaded_by || null,
    uploadedByName: prescription.uploaded_by_name || null,
    expiresAt: prescription.expires_at || null,
    status: normalizedStatus,
    createdAt: prescription.created_at || null,
    updatedAt: prescription.updated_at || null,
    medicines: mappedItems,
    items: mappedItems,
    statusHistory: buildPrescriptionStatusHistory({
      ...prescription,
      status: normalizedStatus,
      pharmacistName: prescription.pharmacist_name,
      uploadedByName: prescription.uploaded_by_name,
      pharmacistNotes: prescription.pharmacist_notes,
      rejectionReason: prescription.rejection_reason,
      approvedAt: prescription.approved_at,
      rejectedAt: prescription.rejected_at,
      completedAt: prescription.completed_at,
      createdAt: prescription.created_at,
      updatedAt: prescription.updated_at,
    }),
  };

  return mapped;
}

export function mapConversation(conversation) {
  if (!conversation) return null;

  const patientName = fullName(conversation.patient_first_name, conversation.patient_last_name);
  const pharmacistName = fullName(conversation.pharmacist_first_name, conversation.pharmacist_last_name);

  return {
    id: conversation.id,
    patientId: conversation.patient_id || null,
    assignedPharmacistId: conversation.assigned_pharmacist_id || null,
    status: conversation.status,
    subject: conversation.subject,
    contextType: conversation.context_type || null,
    contextId: conversation.context_id || null,
    priority: conversation.priority || 'NORMAL',
    closedAt: conversation.closed_at || null,
    closedBy: conversation.closed_by || null,
    patientName,
    patientFirstName: conversation.patient_first_name || null,
    patientLastName: conversation.patient_last_name || null,
    patientEmail: conversation.patient_email || null,
    patientPhone: conversation.patient_phone || null,
    pharmacistName,
    pharmacistFirstName: conversation.pharmacist_first_name || null,
    pharmacistLastName: conversation.pharmacist_last_name || null,
    unreadCount: Number(conversation.unread_count || 0),
    lastMessage: conversation.last_message || null,
    lastMessageAt: conversation.last_message_at || null,
    lastMessageSenderRole: conversation.last_message_sender_role || null,
    lastMessageRead: conversation.last_message_read || false,
    createdAt: conversation.created_at || null,
    updatedAt: conversation.updated_at || null,
  };
}

export function mapMessage(message) {
  if (!message) return null;

  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    senderRole: message.sender_role,
    content: message.content,
    isPrivateNote: message.is_private_note,
    attachmentUrl: message.attachment_url || null,
    attachmentType: message.attachment_type || null,
    attachmentName: message.attachment_name || null,
    readAt: message.read_at || null,
    createdAt: message.created_at || null,
    firstName: message.first_name || null,
    lastName: message.last_name || null,
    role: message.role || null,
  };
}

export function mapAuditLog(log) {
  if (!log) return null;

  const metadata = parseJson(log.metadata);

  return {
    id: log.id,
    userId: log.user_id || null,
    action: log.action,
    entityType: log.entity,
    entityId: log.entity_id,
    description: log.description || null,
    ipAddress: log.ip_address || null,
    userAgent: log.user_agent || null,
    createdAt: log.created_at || null,
    details: metadata,
    changes: metadata?.changes || metadata?.diff || [],
    user: log.user_name
      ? {
          name: log.user_name,
          email: log.user_email || null,
          role: log.user_role || null,
        }
      : null,
  };
}

export function mapMedicine(medicine) {
  if (!medicine) return null;

  return {
    id: medicine.id,
    name: medicine.name,
    genericName: medicine.generic_name || null,
    brandName: medicine.brand_name || null,
    categoryId: medicine.category_id || null,
    categoryName: medicine.category_name || null,
    manufacturer: medicine.manufacturer || null,
    description: medicine.description || null,
    price: medicine.price ?? null,
    costPrice: medicine.cost_price ?? null,
    requiresPrescription: medicine.requires_prescription,
    isActive: medicine.is_active,
    isControlled: medicine.is_controlled,
    strength: medicine.strength || null,
    dosageForm: medicine.dosage_form || null,
    unitOfMeasure: medicine.unit_of_measure || null,
    storageConditions: medicine.storage_conditions || null,
    sideEffects: medicine.side_effects || null,
    contraindications: medicine.contraindications || null,
    symptoms: medicine.symptoms || null,
    indications: medicine.indications || null,
    tags: medicine.tags || [],
    quantity: medicine.current_stock ?? medicine.quantity ?? 0,
    currentStock: medicine.current_stock ?? medicine.quantity ?? 0,
    minStockLevel: medicine.min_stock_level ?? null,
    maxStockLevel: medicine.max_stock_level ?? null,
    reorderPoint: medicine.reorder_point ?? null,
    barcode: medicine.barcode || null,
    imageUrl: medicine.image_url || null,
    classification: medicine.classification || (medicine.requires_prescription ? 'PRESCRIPTION_REQUIRED' : 'OTC'),
    packSize: medicine.pack_size || null,
    sellingUnit: medicine.selling_unit || 'pack',
    availabilityStatus: medicine.availability_status || (Number(medicine.current_stock) > 0 ? 'IN_STOCK' : 'UNAVAILABLE'),
    generalWarnings: medicine.general_warnings || null,
    approvedInformationUrl: medicine.approved_information_url || null,
    otcReviewRequired: Boolean(medicine.otc_review_required),
    createdAt: medicine.created_at || null,
    updatedAt: medicine.updated_at || null,
  };
}

export function mapSaleItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    saleId: item.sale_id || null,
    medicineId: item.medicine_id || null,
    medicineName: item.medicine_name || null,
    stockBatchId: item.stock_batch_id || null,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    totalPrice: Number(item.total_price || 0),
    discountAmount: Number(item.discount_amount || 0),
    createdAt: item.created_at || null,
  };
}

export function mapSale(sale, items = []) {
  if (!sale) return null;

  const mappedItems = items.map(mapSaleItem).filter(Boolean);

  return {
    id: sale.id,
    referenceNumber: sale.reference_number || null,
    cashierId: sale.cashier_id || null,
    pharmacistId: sale.pharmacist_id || null,
    prescriptionId: sale.prescription_id || null,
    customerName: sale.customer_name || null,
    customerPhone: sale.customer_phone || null,
    customerEmail: sale.customer_email || null,
    totalAmount: Number(sale.total_amount || 0),
    discountAmount: Number(sale.discount_amount || 0),
    taxAmount: Number(sale.tax_amount || 0),
    grandTotal: Number(sale.grand_total || 0),
    amountTendered: sale.amount_tendered !== null && sale.amount_tendered !== undefined ? Number(sale.amount_tendered) : null,
    changeAmount: Number(sale.change_amount || 0),
    paymentMethod: sale.payment_method || null,
    status: sale.status,
    notes: sale.notes || null,
    posMetadata: sale.pos_metadata || null,
    cashierName: sale.cashier_name || null,
    pharmacistName: sale.pharmacist_name || null,
    itemCount: Number(sale.item_count || mappedItems.length || 0),
    createdAt: sale.created_at || null,
    updatedAt: sale.updated_at || null,
    items: mappedItems,
  };
}

export function mapDrugInteraction(interaction) {
  if (!interaction) return null;

  return {
    id: interaction.id,
    medicineAId: interaction.medicine_a_id || null,
    medicineBId: interaction.medicine_b_id || null,
    medicineAName: interaction.medicine_a_name || null,
    medicineBName: interaction.medicine_b_name || null,
    severity: interaction.severity || 'MILD',
    description: interaction.description || null,
    recommendation: interaction.recommendation || null,
    evidenceLevel: interaction.evidence_level || null,
    source: interaction.source || null,
    createdAt: interaction.created_at || null,
  };
}

export function mapAllergy(allergy) {
  if (!allergy) return null;

  return {
    id: allergy.id,
    patientPhone: allergy.patient_phone || null,
    patientName: allergy.patient_name || null,
    allergenType: allergy.allergen_type || null,
    allergenName: allergy.allergen_name || null,
    severity: allergy.severity || null,
    reaction: allergy.reaction || null,
    notes: allergy.notes || null,
    createdAt: allergy.created_at || null,
    updatedAt: allergy.updated_at || null,
  };
}

export function mapCategory(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug || null,
    description: category.description || null,
    parentId: category.parent_id || null,
    isActive: category.is_active,
    createdAt: category.created_at || null,
    updatedAt: category.updated_at || null,
  };
}

export function mapSupplier(supplier) {
  if (!supplier) return null;
  return {
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contact_person || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    address: supplier.address || null,
    city: supplier.city || null,
    country: supplier.country || 'Rwanda',
    taxId: supplier.tax_id || null,
    paymentTerms: supplier.payment_terms || null,
    isActive: supplier.is_active,
    notes: supplier.notes || null,
    createdAt: supplier.created_at || null,
    updatedAt: supplier.updated_at || null,
  };
}

export function mapStockBatch(batch) {
  if (!batch) return null;
  return {
    id: batch.id,
    medicineId: batch.medicine_id || null,
    medicineName: batch.medicine_name || null,
    genericName: batch.generic_name || null,
    brandName: batch.brand_name || null,
    supplierId: batch.supplier_id || null,
    supplierName: batch.supplier_name || null,
    batchNumber: batch.batch_number,
    quantity: Number(batch.quantity || 0),
    remainingQuantity: Number(batch.remaining_quantity || 0),
    unitCost: Number(batch.unit_cost || 0),
    sellingPrice: batch.selling_price !== null && batch.selling_price !== undefined ? Number(batch.selling_price) : null,
    manufacturingDate: batch.manufacturing_date || null,
    expiryDate: batch.expiry_date || null,
    receivedDate: batch.received_date || null,
    isExpired: batch.is_expired,
    notes: batch.notes || null,
    createdAt: batch.created_at || null,
    updatedAt: batch.updated_at || null,
  };
}

export function mapStockMovement(movement) {
  if (!movement) return null;
  return {
    id: movement.id,
    medicineId: movement.medicine_id || null,
    medicineName: movement.medicine_name || null,
    stockBatchId: movement.stock_batch_id || null,
    movementType: movement.movement_type,
    quantity: Number(movement.quantity || 0),
    previousStock: Number(movement.previous_stock || 0),
    newStock: Number(movement.new_stock || 0),
    referenceType: movement.reference_type || null,
    referenceId: movement.reference_id || null,
    notes: movement.notes || null,
    performedBy: movement.performed_by || null,
    performedByName: movement.performed_by_name || null,
    createdAt: movement.created_at || null,
  };
}

export function mapPatientSettings(settings) {
  if (!settings) return null;

  return {
    userId: settings.user_id,
    prescriptionUpdates: settings.prescription_updates,
    messageAlerts: settings.message_alerts,
    appointmentReminders: settings.appointment_reminders,
    marketingEmails: settings.marketing_emails,
    shareReadReceipts: settings.share_read_receipts,
    compactView: settings.compact_view,
    createdAt: settings.created_at || null,
    updatedAt: settings.updated_at || null,
  };
}
