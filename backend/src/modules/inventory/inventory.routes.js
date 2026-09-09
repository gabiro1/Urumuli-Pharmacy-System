import { Router } from 'express';
import multer from 'multer';
import * as inventoryController from './inventory.controller.js';
import { authenticate, optionalAuth } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import { ROLES } from '../../constants.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

const router = Router();
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPG, PNG, and WEBP product images are allowed'), false),
});

router.get('/summary', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.INVENTORY_MANAGER), inventoryController.getSummary);
router.get('/categories', inventoryController.listCategories);
router.get('/medicines', optionalAuth, inventoryController.listMedicines);
router.get('/medicines/barcode/:code', optionalAuth, inventoryController.getMedicineByBarcode);
router.get('/medicines/:id', optionalAuth, inventoryController.getMedicine);
// Products is the unified catalog. These aliases deliberately retain the medicines table and IDs
// so prescriptions, batches, sales, and existing catalogue integrations remain intact.
router.get('/products', optionalAuth, inventoryController.listMedicines);
router.get('/products/:id', optionalAuth, inventoryController.getMedicine);

router.get('/suppliers', inventoryController.listSuppliers);
router.get('/suppliers/:id', inventoryController.getSupplier);

router.get('/batches', authenticate, inventoryController.listBatches);
router.get('/batches/:id', authenticate, inventoryController.getBatch);

router.get('/stock-movements', authenticate, inventoryController.listStockMovements);

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.INVENTORY_MANAGER));

router.post('/medicines', auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.MEDICINE), inventoryController.createMedicine);
router.put('/medicines/:id', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.MEDICINE), inventoryController.updateMedicine);
router.delete('/medicines/:id', auditMiddleware(AUDIT_ACTION.DELETE, AUDIT_ENTITY.MEDICINE), inventoryController.deleteMedicine);
router.post('/products', auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.MEDICINE), inventoryController.createMedicine);
router.put('/products/:id', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.MEDICINE), inventoryController.updateMedicine);
router.delete('/products/:id', auditMiddleware(AUDIT_ACTION.DELETE, AUDIT_ENTITY.MEDICINE), inventoryController.deleteMedicine);
router.patch('/products/:id/archive', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.MEDICINE), inventoryController.archiveMedicine);
router.patch('/products/:id/stock', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.INVENTORY), inventoryController.adjustProductStock);
router.post('/products/:id/image', productImageUpload.single('image'), auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.MEDICINE), inventoryController.uploadProductImage);

router.post('/categories', auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.CATEGORY), inventoryController.createCategory);
router.put('/categories/:id', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.CATEGORY), inventoryController.updateCategory);
router.delete('/categories/:id', auditMiddleware(AUDIT_ACTION.DELETE, AUDIT_ENTITY.CATEGORY), inventoryController.deleteCategory);

router.post('/suppliers', auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.SUPPLIER), inventoryController.createSupplier);
router.put('/suppliers/:id', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.SUPPLIER), inventoryController.updateSupplier);
router.delete('/suppliers/:id', auditMiddleware(AUDIT_ACTION.DELETE, AUDIT_ENTITY.SUPPLIER), inventoryController.deleteSupplier);

router.post('/batches', auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.STOCK_BATCH), inventoryController.createBatch);
router.put('/batches/:id', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.STOCK_BATCH), inventoryController.updateBatch);

router.post('/stock-adjust', auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.INVENTORY), inventoryController.adjustStock);

export default router;
