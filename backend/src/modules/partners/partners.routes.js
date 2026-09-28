import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';
import * as partnersController from './partners.controller.js';
import { validateCreatePartner, validateUpdatePartner } from './partners.validation.js';

const router = Router();

const { ADMIN } = ROLES;

const partnerLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPG, PNG, and WEBP logos are allowed'), false),
});

router.get('/active', partnersController.listActivePartners);

router.use(authenticate);
router.use(authorize(ADMIN));

router.get('/', partnersController.listAllPartners);
router.get('/:id', partnersController.getPartnerById);
router.post('/', validateCreatePartner, partnersController.createPartner);
router.post('/upload-logo', partnerLogoUpload.single('logo'), partnersController.uploadLogo);
router.put('/:id', validateUpdatePartner, partnersController.updatePartner);
router.delete('/:id', partnersController.deletePartner);

export default router;
