import { NotFoundError, ValidationError } from '../../utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { parsePagination } from '../../utils/pagination.js';
import { mapCategory, mapMedicine, mapSupplier, mapStockBatch, mapStockMovement } from '../../utils/serializers.js';
import * as inventoryRepository from './inventory.repository.js';
import { cacheRemember, cacheDelKey, invalidateMedicineCache } from '../../services/redis.service.js';

function normalizeTags(tags, partial = false) {
  if (tags === undefined) return partial ? undefined : [];
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function resolveValue(value, fallback, transform = (v) => v, partial = false) {
  if (value === undefined) return partial ? undefined : fallback;
  if (value === null) return partial ? null : fallback;
  return transform(value);
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  return Boolean(value);
}

function normalizeMedicinePayload(data, partial = false) {
  return {
    name: resolveValue(data.name, '', undefined, partial),
    generic_name: resolveValue(data.genericName ?? data.generic_name, null, undefined, partial),
    brand_name: resolveValue(data.brandName ?? data.brand_name, null, undefined, partial),
    category_id: resolveValue(data.categoryId ?? data.category_id, null, undefined, partial),
    manufacturer: resolveValue(data.manufacturer, null, undefined, partial),
    description: resolveValue(data.description, null, undefined, partial),
    price: resolveValue(data.price, 0, (value) => Number(value), partial),
    cost_price: resolveValue(data.costPrice ?? data.cost_price, 0, (value) => Number(value), partial),
    requires_prescription: resolveValue(
      data.requiresPrescription ?? data.requires_prescription,
      false,
      toBoolean,
      partial
    ),
    is_active: resolveValue(data.isActive ?? data.is_active, true, toBoolean, partial),
    is_controlled: resolveValue(data.isControlled ?? data.is_controlled, false, toBoolean, partial),
    strength: resolveValue(data.strength, null, undefined, partial),
    dosage_form: resolveValue(data.dosageForm ?? data.dosage_form, null, undefined, partial),
    unit_of_measure: resolveValue(data.unitOfMeasure ?? data.unit_of_measure, 'TABLET', undefined, partial),
    storage_conditions: resolveValue(data.storageConditions ?? data.storage_conditions, null, undefined, partial),
    side_effects: resolveValue(data.sideEffects ?? data.side_effects, null, undefined, partial),
    contraindications: resolveValue(data.contraindications, null, undefined, partial),
    symptoms: resolveValue(data.symptoms, null, undefined, partial),
    indications: resolveValue(data.indications, null, undefined, partial),
    tags: normalizeTags(data.tags, partial),
    min_stock_level: resolveValue(data.minStockLevel ?? data.min_stock_level, 10, (value) => Number(value), partial),
    max_stock_level: resolveValue(data.maxStockLevel ?? data.max_stock_level, 1000, (value) => Number(value), partial),
    current_stock: resolveValue(data.currentStock ?? data.current_stock, 0, (value) => Number(value), partial),
    reorder_point: resolveValue(data.reorderPoint ?? data.reorder_point, 20, (value) => Number(value), partial),
    barcode: resolveValue(data.barcode, null, undefined, partial),
    image_url: resolveValue(data.imageUrl ?? data.image_url, null, undefined, partial),
    classification: resolveValue(data.classification, 'OTC', undefined, partial),
    pack_size: resolveValue(data.packSize ?? data.pack_size, null, undefined, partial),
    selling_unit: resolveValue(data.sellingUnit ?? data.selling_unit, 'pack', undefined, partial),
    availability_status: resolveValue(data.availabilityStatus ?? data.availability_status, 'IN_STOCK', undefined, partial),
    general_warnings: resolveValue(data.generalWarnings ?? data.general_warnings, null, undefined, partial),
    approved_information_url: resolveValue(data.approvedInformationUrl ?? data.approved_information_url, null, undefined, partial),
    otc_review_required: resolveValue(data.otcReviewRequired ?? data.otc_review_required, false, toBoolean, partial),
    product_type: resolveValue(data.productType ?? data.product_type, 'MEDICINE', undefined, partial),
    subcategory: resolveValue(data.subcategory, null, undefined, partial),
    sku: resolveValue(data.sku, null, undefined, partial),
    supplier_id: resolveValue(data.supplierId ?? data.supplier_id, null, undefined, partial),
    expiry_date: resolveValue(data.expiryDate ?? data.expiry_date, null, undefined, partial),
    active_ingredients: resolveValue(data.activeIngredients ?? data.active_ingredients, null, undefined, partial),
    route_of_administration: resolveValue(data.routeOfAdministration ?? data.route_of_administration, null, undefined, partial),
    dosage_instructions: resolveValue(data.dosageInstructions ?? data.dosage_instructions, null, undefined, partial),
    care_purpose: resolveValue(data.carePurpose ?? data.care_purpose, null, undefined, partial),
    ingredients: resolveValue(data.ingredients, null, undefined, partial),
    usage_instructions: resolveValue(data.usageInstructions ?? data.usage_instructions, null, undefined, partial),
    size_description: resolveValue(data.sizeDescription ?? data.size_description, null, undefined, partial),
  };
}

function ensureMedicineName(value) {
  if (!value || !String(value).trim()) {
    throw new ValidationError('Medicine name is required', [
      { field: 'name', message: 'Medicine name is required', code: 'invalid_type' },
    ]);
  }
}

function ensureProductNumbers(data) {
  for (const field of ['price', 'costPrice', 'currentStock', 'minStockLevel', 'reorderPoint']) {
    if (data[field] !== undefined && data[field] !== null && Number(data[field]) < 0) {
      throw new ValidationError(`${field} cannot be negative`, [{ field, message: `${field} cannot be negative`, code: 'too_small' }]);
    }
  }
  if (data.productType && !['MEDICINE', 'PHARMACY_CARE'].includes(data.productType)) {
    throw new ValidationError('Invalid product type');
  }
}

export async function listMedicines(queryParams) {
  const pagination = parsePagination(queryParams, {
    allowedSortColumns: ['name', 'price', 'current_stock', 'created_at', 'updated_at', 'expiry_date'],
    defaultSortBy: 'name',
    defaultSortOrder: 'ASC',
  });

  const hasFilters = queryParams.search || queryParams.categoryId || queryParams.requiresPrescription || queryParams.isActive || queryParams.classification || queryParams.availability || queryParams.dosageForm || queryParams.productType || queryParams.stockStatus || queryParams.expiry || queryParams.minPrice || queryParams.maxPrice || queryParams.brand || queryParams.supplierId;
  const cacheKey = `medicines:list:${JSON.stringify({ ...queryParams, page: pagination.page, limit: pagination.limit })}`;

  const fetchFn = async () => {
    const result = await inventoryRepository.listMedicines({
      limit: pagination.limit,
      offset: pagination.offset,
      search: queryParams.search || queryParams.q || null,
      categoryId: queryParams.categoryId || null,
      requiresPrescription: queryParams.requiresPrescription !== undefined
        ? queryParams.requiresPrescription === 'true'
        : undefined,
      isActive: queryParams.isActive !== undefined ? queryParams.isActive === 'true' : undefined,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
      classification: queryParams.classification || null,
      availability: queryParams.availability || null,
      dosageForm: queryParams.dosageForm || null,
      productType: queryParams.productType || null,
      stockStatus: queryParams.stockStatus || null,
      expiry: queryParams.expiry || null,
      minPrice: queryParams.minPrice !== undefined ? Number(queryParams.minPrice) : null,
      maxPrice: queryParams.maxPrice !== undefined ? Number(queryParams.maxPrice) : null,
      brand: queryParams.brand || null,
      supplierId: queryParams.supplierId || null,
    });

    return {
      data: result.rows.map((row) => mapMedicine(row)),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
      },
    };
  };

  if (hasFilters) return fetchFn();
  return cacheRemember(cacheKey, 120, fetchFn);
}

export async function searchMedicines(queryParams) {
  return listMedicines(queryParams);
}

export async function autocompleteMedicines({ q = '', limit = 8 } = {}) {
  const search = (q || '').trim();
  if (search.length < 2) return [];
  const cappedLimit = Math.min(Number(limit) || 8, 20);
  const rows = await inventoryRepository.autocompleteMedicines({ search, limit: cappedLimit });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    genericName: row.generic_name,
    brandName: row.brand_name,
  }));
}

export async function getMedicine(id) {
  return cacheRemember(`medicines:detail:${id}`, 120, async () => {
    const medicine = await inventoryRepository.findMedicineById(id);
    if (!medicine) throw new NotFoundError('Medicine', id);
    return mapMedicine(medicine);
  });
}

export async function getMedicineByBarcode(barcode) {
  const code = String(barcode || '').trim();
  if (!code) return null;
  const medicine = await inventoryRepository.findMedicineByBarcode(code);
  if (!medicine) return null;
  return mapMedicine(medicine);
}

export async function createMedicine(data) {
  ensureMedicineName(data.name);
  ensureProductNumbers(data);
  const medicine = await inventoryRepository.createMedicine(normalizeMedicinePayload(data));
  await invalidateMedicineCache();
  return mapMedicine(medicine);
}

export async function updateMedicine(id, data) {
  const existing = await inventoryRepository.findMedicineById(id);
  if (!existing) throw new NotFoundError('Medicine', id);
  if (data.name !== undefined) {
    ensureMedicineName(data.name);
  }
  ensureProductNumbers(data);

  const medicine = await inventoryRepository.updateMedicine(id, normalizeMedicinePayload(data, true));
  await invalidateMedicineCache();
  await cacheDelKey(`medicines:detail:${id}`);
  return mapMedicine(medicine);
}

export async function deleteMedicine(id) {
  const existing = await inventoryRepository.findMedicineById(id);
  if (!existing) throw new NotFoundError('Medicine', id);

  const hasReferences = await inventoryRepository.productHasReferences(id);
  if (hasReferences) {
    const archived = await inventoryRepository.archiveMedicine(id);
    await invalidateMedicineCache();
    await cacheDelKey(`medicines:detail:${id}`);
    return { ...mapMedicine(archived), archivedInstead: true };
  }

  const medicine = await inventoryRepository.deleteMedicine(id);
  await invalidateMedicineCache();
  await cacheDelKey(`medicines:detail:${id}`);
  return mapMedicine(medicine);
}

export async function archiveMedicine(id) {
  const existing = await inventoryRepository.findMedicineById(id);
  if (!existing) throw new NotFoundError('Product', id);
  const medicine = await inventoryRepository.archiveMedicine(id);
  await invalidateMedicineCache();
  await cacheDelKey(`medicines:detail:${id}`);
  return mapMedicine(medicine);
}

export async function uploadProductImage(id, file) {
  const existing = await inventoryRepository.findMedicineById(id);
  if (!existing) throw new NotFoundError('Product', id);
  if (!file) throw new ValidationError('Product image is required');
  const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
  const relativePath = `products/${randomUUID()}.${extension}`;
  const target = path.resolve(env.UPLOAD_DIR, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.buffer);
  const product = await inventoryRepository.updateMedicine(id, { image_url: `/uploads/${relativePath}` });
  await invalidateMedicineCache();
  await cacheDelKey(`medicines:detail:${id}`);
  return mapMedicine(product);
}

export async function listCategories() {
  return cacheRemember('categories:list', 600, async () => {
    const categories = await inventoryRepository.listCategories();
    return categories.map((category) => mapCategory(category));
  });
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createCategory(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new ValidationError('Category name is required');
  const slug = data.slug ? slugify(data.slug) : slugify(name);
  if (!slug) throw new ValidationError('Category name must include letters or numbers');

  const existing = await inventoryRepository.findCategoryBySlug(slug);
  if (existing) {
    throw new ValidationError(`Category '${slug}' already exists`, [
      { field: 'slug', message: 'A category with this name already exists', code: 'unique' },
    ]);
  }

  const category = await inventoryRepository.createCategory({
    name,
    slug,
    description: data.description || null,
    parent_id: data.parentId || null,
    is_active: data.isActive !== undefined ? toBoolean(data.isActive) : true,
  });
  await cacheDelKey('categories:list');
  await invalidateMedicineCache();
  return mapCategory(category);
}

export async function updateCategory(id, data) {
  const existing = await inventoryRepository.findCategoryById(id);
  if (!existing) throw new NotFoundError('Category', id);

  const payload = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new ValidationError('Category name cannot be empty');
    payload.name = name;
    payload.slug = slugify(name);
  }
  if (data.description !== undefined) payload.description = data.description;
  if (data.parentId !== undefined) payload.parent_id = data.parentId || null;
  if (data.isActive !== undefined) payload.is_active = toBoolean(data.isActive);

  if (payload.slug && payload.slug !== existing.slug) {
    const clash = await inventoryRepository.findCategoryBySlug(payload.slug);
    if (clash && clash.id !== id) {
      throw new ValidationError(`Category '${payload.slug}' already exists`, [
        { field: 'name', message: 'A category with this name already exists', code: 'unique' },
      ]);
    }
  }

  const category = await inventoryRepository.updateCategory(id, payload);
  await cacheDelKey('categories:list');
  await invalidateMedicineCache();
  return mapCategory(category);
}

export async function deleteCategory(id) {
  const existing = await inventoryRepository.findCategoryById(id);
  if (!existing) throw new NotFoundError('Category', id);

  const productCount = await inventoryRepository.countProductsByCategory(id);
  if (productCount > 0) {
    const category = await inventoryRepository.updateCategory(id, { is_active: false });
    await cacheDelKey('categories:list');
    await invalidateMedicineCache();
    return { ...mapCategory(category), archivedInstead: true };
  }

  const category = await inventoryRepository.deleteCategory(id);
  await cacheDelKey('categories:list');
  return mapCategory(category);
}

export async function getSummary() {
  return cacheRemember('inventory:summary', 120, () => inventoryRepository.getInventorySummary());
}

// ---------------------------------------------------------------- Suppliers

export async function listSuppliers(queryParams) {
  const result = await inventoryRepository.listSuppliers({
    search: queryParams.search || null,
    isActive: queryParams.isActive !== undefined ? queryParams.isActive : null,
  });

  return {
    data: result.rows.map(mapSupplier),
    meta: { total: result.total },
  };
}

export async function getSupplier(id) {
  const supplier = await inventoryRepository.findSupplierById(id);
  if (!supplier) throw new NotFoundError('Supplier', id);
  return mapSupplier(supplier);
}

function normalizeSupplierPayload(data, partial = false) {
  return {
    name: data.name ?? (partial ? undefined : ''),
    contact_person: data.contactPerson ?? data.contact_person ?? (partial ? undefined : null),
    email: data.email ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    country: data.country ?? (partial ? undefined : 'Rwanda'),
    tax_id: data.taxId ?? data.tax_id ?? null,
    payment_terms: data.paymentTerms ?? data.payment_terms ?? null,
    is_active: data.isActive ?? data.is_active ?? (partial ? undefined : true),
    notes: data.notes ?? null,
  };
}

export async function createSupplier(data) {
  if (!data.name?.trim()) {
    throw new ValidationError('Supplier name is required');
  }
  const supplier = await inventoryRepository.createSupplier(normalizeSupplierPayload(data));
  await cacheDelKey('suppliers:list');
  return mapSupplier(supplier);
}

export async function updateSupplier(id, data) {
  const existing = await inventoryRepository.findSupplierById(id);
  if (!existing) throw new NotFoundError('Supplier', id);
  const supplier = await inventoryRepository.updateSupplier(id, normalizeSupplierPayload(data, true));
  await cacheDelKey('suppliers:list');
  return mapSupplier(supplier);
}

export async function deleteSupplier(id) {
  const existing = await inventoryRepository.findSupplierById(id);
  if (!existing) throw new NotFoundError('Supplier', id);
  const supplier = await inventoryRepository.deleteSupplier(id);
  await cacheDelKey('suppliers:list');
  return mapSupplier(supplier);
}

// ---------------------------------------------------------------- Batches

export async function listBatches(queryParams) {
  const pagination = parsePagination(queryParams);
  const result = await inventoryRepository.listBatches({
    search: queryParams.search || null,
    medicineId: queryParams.medicineId || null,
    supplierId: queryParams.supplierId || null,
    status: queryParams.status || null,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return {
    data: result.rows.map(mapStockBatch),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
    },
  };
}

export async function getBatch(id) {
  const batch = await inventoryRepository.findBatchById(id);
  if (!batch) throw new NotFoundError('Stock batch', id);
  return mapStockBatch(batch);
}

export async function createBatch(data, user) {
  if (!data.medicineId || !data.batchNumber || !data.expiryDate) {
    throw new ValidationError('Medicine, batch number, and expiry date are required');
  }
  const quantity = Number(data.quantity || 0);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be a positive integer');
  }
  const batch = await inventoryRepository.createBatch(
    {
      medicineId: data.medicineId,
      supplierId: data.supplierId || null,
      batchNumber: data.batchNumber,
      quantity,
      unitCost: data.unitCost ?? 0,
      sellingPrice: data.sellingPrice ?? null,
      manufacturingDate: data.manufacturingDate || null,
      expiryDate: data.expiryDate,
      notes: data.notes || null,
    },
    user?.userId || null
  );
  await invalidateMedicineCache();
  return mapStockBatch(await inventoryRepository.findBatchById(batch.id));
}

export async function updateBatch(id, data) {
  const existing = await inventoryRepository.findBatchById(id);
  if (!existing) throw new NotFoundError('Stock batch', id);

  const payload = {
    ...(data.supplierId !== undefined && { supplier_id: data.supplierId }),
    ...(data.batchNumber !== undefined && { batch_number: data.batchNumber }),
    ...(data.quantity !== undefined && { quantity: data.quantity }),
    ...(data.remainingQuantity !== undefined && { remaining_quantity: data.remainingQuantity }),
    ...(data.unitCost !== undefined && { unit_cost: data.unitCost }),
    ...(data.sellingPrice !== undefined && { selling_price: data.sellingPrice }),
    ...(data.manufacturingDate !== undefined && { manufacturing_date: data.manufacturingDate }),
    ...(data.expiryDate !== undefined && { expiry_date: data.expiryDate }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };

  const batch = await inventoryRepository.updateBatch(id, payload);
  await invalidateMedicineCache();
  return mapStockBatch(batch);
}

// ---------------------------------------------------------------- Movements

export async function listStockMovements(queryParams) {
  const pagination = parsePagination(queryParams);
  const result = await inventoryRepository.listStockMovements({
    search: queryParams.search || null,
    medicineId: queryParams.medicineId || null,
    movementType: queryParams.movementType || null,
    fromDate: queryParams.fromDate || null,
    toDate: queryParams.toDate || null,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return {
    data: result.rows.map(mapStockMovement),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
    },
  };
}

export async function adjustStock(data, user) {
  const quantity = Number(data.quantity || 0);
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new ValidationError('Quantity must be a non-zero integer');
  }
  const movement = await inventoryRepository.adjustStock(
    {
      medicineId: data.medicineId,
      stockBatchId: data.stockBatchId || null,
      quantity,
      reason: data.reason || null,
    },
    user?.userId || null
  );
  await invalidateMedicineCache();
  return mapStockMovement(movement);
}
