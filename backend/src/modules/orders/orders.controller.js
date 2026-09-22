import fs from 'fs';
import * as service from './orders.service.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

export async function createOrder(req,res,next){try{return sendCreated(res,await service.createOrder(req.body,req.user,req.get('Idempotency-Key')),'Order created');}catch(e){next(e)}}
export async function getOrder(req,res,next){try{return sendSuccess(res,await service.getOrder(req.params.id,req.user));}catch(e){next(e)}}
export async function myOrders(req,res,next){try{return sendSuccess(res,await service.listMyOrders(req.user));}catch(e){next(e)}}
export async function queue(req,res,next){try{return sendSuccess(res,await service.listQueue(req.query));}catch(e){next(e)}}
export async function transition(req,res,next){try{return sendSuccess(res,await service.transitionOrder(req.params.id,req.body.status,req.user,req.body),'Order status updated');}catch(e){next(e)}}
export async function confirm(req,res,next){try{const order=await service.getOrder(req.params.id,req.user);const target=order.status==='APPROVED_AWAITING_PATIENT_CONFIRMATION'?'APPROVED_AWAITING_PAYMENT':null;if(!target)throw new ValidationError('Order is not awaiting confirmation');return sendSuccess(res,await service.transitionOrder(order.id,target,req.user,{reason:'Patient accepted approved order'}),'Order confirmed');}catch(e){next(e)}}
export async function saveInstruction(req,res,next){try{return sendCreated(res,await service.saveInstruction(req.params.id,req.body,req.user),'Medication directions verified');}catch(e){next(e)}}
export async function uploadPrescription(req,res,next){try{return sendCreated(res,await service.uploadPrescription(req.params.id,req.files,req.user),'Prescription submitted securely');}catch(e){next(e)}}
export async function downloadPrescription(req,res,next){try{const file=await service.getPrescriptionFile(req.params.fileId,req.user);res.setHeader('Content-Type',file.mime_type);res.setHeader('Content-Disposition',`inline; filename="prescription${file.original_extension}"`);res.setHeader('Cache-Control','private, no-store');createAuditLog({userId:req.user?.userId,action:AUDIT_ACTION.READ,entity:AUDIT_ENTITY.PRESCRIPTION_FILE,entityId:file.id,description:`Prescription file ${file.id} downloaded by ${req.user?.role}`,ipAddress:req.ip,userAgent:req.get('User-Agent')}).catch(console.error);return fs.createReadStream(file.absolutePath).on('error',next).pipe(res);}catch(e){next(e)}}
export async function startPayment(req,res,next){try{return sendSuccess(res,await service.startPayment(req.params.id,req.user,req.get('Idempotency-Key'),req.body.method),'Payment option processed');}catch(e){next(e)}}
export async function paymentSummary(req,res,next){try{return sendSuccess(res,await service.getPaymentSummary(req.params.id,req.user));}catch(e){next(e)}}
export async function paymentProviders(req,res,next){try{return sendSuccess(res,await service.paymentProviderStatus());}catch(e){next(e)}}
