import * as inventoryService from './inventory.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

function publicMedicine(medicine) {
  const safe = { ...medicine };
  for (const key of ['costPrice', 'currentStock', 'quantity', 'minStockLevel', 'maxStockLevel', 'reorderPoint', 'barcode']) {
    delete safe[key];
  }
  return safe;
}
const canViewInternal = (req) => ['ADMIN', 'MANAGER', 'PHARMACIST', 'INVENTORY_MANAGER', 'AUDITOR'].includes(req.user?.role);

export async function listMedicines(req, res, next) {
  try {
    const result = await inventoryService.listMedicines(req.query);
    return sendSuccess(res, canViewInternal(req) ? result.data : result.data.map(publicMedicine), 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function searchMedicines(req, res, next) {
  try {
    const result = await inventoryService.searchMedicines(req.query);
    return sendSuccess(res, canViewInternal(req) ? result.data : result.data.map(publicMedicine), 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getMedicine(req, res, next) {
  try {
    const medicine = await inventoryService.getMedicine(req.params.id);
    return sendSuccess(res, canViewInternal(req) ? medicine : publicMedicine(medicine));
  } catch (error) {
    next(error);
  }
}

export async function createMedicine(req, res, next) {
  try {
    const medicine = await inventoryService.createMedicine(req.body);
    return sendCreated(res, medicine, 'Medicine created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateMedicine(req, res, next) {
  try {
    const medicine = await inventoryService.updateMedicine(req.params.id, req.body);
    return sendSuccess(res, medicine, 'Medicine updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteMedicine(req, res, next) {
  try {
    const medicine = await inventoryService.deleteMedicine(req.params.id);
    return sendSuccess(res, medicine, 'Medicine deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function listCategories(req, res, next) {
  try {
    const categories = await inventoryService.listCategories();
    return sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req, res, next) {
  try {
    const summary = await inventoryService.getSummary();
    return sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------- Suppliers

export async function listSuppliers(req, res, next) {
  try {
    const result = await inventoryService.listSuppliers(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getSupplier(req, res, next) {
  try {
    const supplier = await inventoryService.getSupplier(req.params.id);
    return sendSuccess(res, supplier);
  } catch (error) {
    next(error);
  }
}

export async function createSupplier(req, res, next) {
  try {
    const supplier = await inventoryService.createSupplier(req.body);
    return sendCreated(res, supplier, 'Supplier created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req, res, next) {
  try {
    const supplier = await inventoryService.updateSupplier(req.params.id, req.body);
    return sendSuccess(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteSupplier(req, res, next) {
  try {
    const supplier = await inventoryService.deleteSupplier(req.params.id);
    return sendSuccess(res, supplier, 'Supplier deleted successfully');
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------- Batches

export async function listBatches(req, res, next) {
  try {
    const result = await inventoryService.listBatches(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getBatch(req, res, next) {
  try {
    const batch = await inventoryService.getBatch(req.params.id);
    return sendSuccess(res, batch);
  } catch (error) {
    next(error);
  }
}

export async function createBatch(req, res, next) {
  try {
    const batch = await inventoryService.createBatch(req.body, req.user);
    return sendCreated(res, batch, 'Batch received successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req, res, next) {
  try {
    const batch = await inventoryService.updateBatch(req.params.id, req.body);
    return sendSuccess(res, batch, 'Batch updated successfully');
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------- Movements

export async function listStockMovements(req, res, next) {
  try {
    const result = await inventoryService.listStockMovements(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const movement = await inventoryService.adjustStock(req.body, req.user);
    return sendCreated(res, movement, 'Stock adjusted successfully');
  } catch (error) {
    next(error);
  }
}
