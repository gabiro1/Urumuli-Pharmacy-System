import { Router } from 'express';
import multer from 'multer';
import * as controller from './orders.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';
import { env } from '../../config/env.js';
import { ROLES } from '../../constants.js';
import { createOrderSchema, instructionSchema, requestOtpSchema, transitionSchema, verifyOtpSchema } from './orders.validation.js';

const router=Router();
// File type is determined from its bytes in the service. Browser supplied MIME
// labels are frequently missing or wrong for HEIC, TIFF, and Office files.
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:env.MAX_FILE_SIZE,files:env.MAX_PRESCRIPTION_FILES}});
router.post('/otp/request',authLimiter,validate(requestOtpSchema),controller.requestOtp);
router.post('/otp/verify',authLimiter,validate(verifyOtpSchema),controller.verifyOtp);
router.use(authenticate);
router.post('/',validate(createOrderSchema),controller.createOrder);
router.get('/my',controller.myOrders);
router.get('/prescription-files/:fileId',controller.downloadPrescription);
router.get('/queue',authorize(ROLES.ADMIN,ROLES.MANAGER,ROLES.PHARMACIST),controller.queue);
router.get('/:id',controller.getOrder);
router.post('/:id/prescription',upload.array('files',env.MAX_PRESCRIPTION_FILES),controller.uploadPrescription);
router.post('/:id/confirm',controller.confirm);
router.post('/:id/payment',controller.startPayment);
router.post('/:id/instructions',authorize(ROLES.ADMIN,ROLES.MANAGER,ROLES.PHARMACIST),validate(instructionSchema),controller.saveInstruction);
router.post('/:id/transition',authorize(ROLES.ADMIN,ROLES.MANAGER,ROLES.PHARMACIST),validate(transitionSchema),controller.transition);
export default router;
