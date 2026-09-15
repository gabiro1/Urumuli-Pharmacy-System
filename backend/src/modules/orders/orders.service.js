import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { transaction } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS } from '../../constants.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import * as repo from './orders.repository.js';
import { canTransition, instructionErrors, orderTransitions } from './orderState.js';
import { notifyOrderPatient } from '../../services/notification.service.js';

const normalizePhone = (phone) => phone.replace(/[\s()-]/g,'');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const assertOwner = async (order,user) => {
  const staff=['ADMIN','MANAGER','PHARMACIST','AUDITOR'].includes(user.role);
  const identityId=user.patientIdentityId||(user.userId?(await repo.findIdentityByUser(user.userId))?.id:null);
  if(!staff && order.patient_identity_id!==identityId) throw new ForbiddenError('You cannot access this order');
};
export async function getOrder(id,user){ const order=await repo.findOrder(id); if(!order)throw new NotFoundError('Order',id);await assertOwner(order,user);return {...order,items:await repo.getOrderItems(order.id),instructions:await repo.getInstructions(order.id),history:await repo.getHistory(order.id),prescriptionFiles:await repo.getPrescriptionFiles(order.id)}; }
export const listMyOrders = async (user) => { const identityId=user.patientIdentityId||(await repo.findIdentityByUser(user.userId))?.id;if(!identityId)throw new ForbiddenError('Verified patient identity required');return repo.listOwnedOrders(identityId); };
export const listQueue = (params) => repo.listQueue(params);

export async function createOrder(data,user,idempotencyKey){
  let resolvedIdentityId=user.patientIdentityId||(await repo.findIdentityByUser(user.userId))?.id;
  if(!resolvedIdentityId && user.userId){
    if(!data.phone)throw new ValidationError('A phone number is required to complete this order');
    const identity=await repo.createIdentityForUser(user.userId,normalizePhone(data.phone),data.fullName||null,data.email||null);
    resolvedIdentityId=identity.id;
  }
  if(!resolvedIdentityId)throw new ForbiddenError('A verified patient identity is required');
  if(!idempotencyKey)throw new ValidationError('Idempotency-Key header is required');
  return transaction(async(client)=>{
    const prior=(await client.query(`SELECT response_body FROM idempotency_records WHERE scope='CREATE_ORDER' AND idempotency_key=$1 AND owner_key=$2`,[idempotencyKey,resolvedIdentityId])).rows[0];
    if(prior)return prior.response_body;
    let identity=await repo.findIdentityById(resolvedIdentityId); if(!identity)throw new ForbiddenError('Verified patient identity required');
    identity=(await client.query(`UPDATE patient_identities
      SET full_name=COALESCE(NULLIF($2,''),full_name),email=COALESCE(NULLIF($3,''),email),updated_at=NOW()
      WHERE id=$1 RETURNING *`,[identity.id,data.fullName,data.email||null])).rows[0];
    const resolved=[]; let hasRx=false; let subtotal=0;
    for(const requested of data.items){const med=await repo.getMedicine(requested.medicineId,client);if(!med)throw new NotFoundError('Medicine',requested.medicineId);if(med.classification==='RESTRICTED'||med.availability_status==='UNAVAILABLE'||med.current_stock<=0)throw new ValidationError(`${med.name} is not available for online ordering`);const rx=med.classification==='PRESCRIPTION_REQUIRED'||med.requires_prescription;hasRx ||= rx;const total=Number(med.price)*requested.quantity;subtotal+=total;resolved.push({med,quantity:requested.quantity,total,rx});}
    const deliveryFee=data.fulfilmentMethod==='DELIVERY'?1500:0; const reference=`URU-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const status=hasRx?ORDER_STATUS.AWAITING_PRESCRIPTION:ORDER_STATUS.APPROVED_AWAITING_PAYMENT;
    const order=(await client.query(`INSERT INTO orders(public_reference,patient_identity_id,status,order_type,subtotal,delivery_fee,total,fulfilment_method,delivery_address,payment_method,consented_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,[reference,identity.id,status,hasRx?'PRESCRIPTION':'OTC',subtotal,deliveryFee,subtotal+deliveryFee,data.fulfilmentMethod,data.deliveryAddress||null,data.paymentMethod])).rows[0];
    for(const x of resolved){const oi=(await client.query(`INSERT INTO order_items(order_id,medicine_id,medicine_snapshot,requested_quantity,approved_quantity,selling_unit,unit_price,total,prescription_required,approval_status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[order.id,x.med.id,{name:x.med.name,genericName:x.med.generic_name,strength:x.med.strength,dosageForm:x.med.dosage_form,packSize:x.med.pack_size,sellingUnit:x.med.selling_unit},x.quantity,hasRx?null:x.quantity,x.med.selling_unit,x.med.price,x.total,x.rx,hasRx?'PENDING':'APPROVED'])).rows[0];if(!hasRx){const reserved=(await client.query(`SELECT COALESCE(SUM(quantity),0)::int total FROM inventory_reservations WHERE medicine_id=$1 AND status='ACTIVE' AND expires_at>NOW()`,[x.med.id])).rows[0].total;if(x.med.current_stock-reserved<x.quantity)throw new ValidationError(`${x.med.name} is no longer available in the requested quantity`);await client.query(`INSERT INTO inventory_reservations(order_item_id,medicine_id,quantity,expires_at) VALUES($1,$2,$3,NOW()+($4||' minutes')::interval)`,[oi.id,x.med.id,x.quantity,env.RESERVATION_MINUTES]);}}
    await repo.addHistory(client,{orderId:order.id,newStatus:status,actorRole:user.role,metadata:{requestId:null}});
    await client.query(`INSERT INTO idempotency_records(scope,idempotency_key,owner_key,response_status,response_body) VALUES('CREATE_ORDER',$1,$2,201,$3)`,[idempotencyKey,resolvedIdentityId,order]);return order;
  });
}

export async function transitionOrder(id,target,user,{reason,internalNote}={}){
  return transaction(async(client)=>{const locked=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!locked)throw new NotFoundError('Order',id);if(!canTransition(locked.status,target))throw new ValidationError(`Transition from ${locked.status} to ${target} is not permitted`);
    const reasonRequired=['CLARIFICATION_REQUIRED','PRESCRIBER_CLARIFICATION_REQUIRED','REJECTED_BY_PHARMACIST','CANCELLED'].includes(target);if(reasonRequired&&!reason?.trim())throw new ValidationError('A reason is required for this decision');
    if(target==='APPROVED_AWAITING_PATIENT_CONFIRMATION'){const file=(await client.query(`SELECT pf.id FROM prescription_files pf JOIN prescriptions p ON p.id=pf.prescription_id WHERE p.order_id=$1 LIMIT 1`,[id])).rows[0];if(!file)throw new ValidationError('The original prescription must be available before approval');const missing=(await client.query(`SELECT oi.id FROM order_items oi LEFT JOIN medication_instructions mi ON mi.order_item_id=oi.id AND mi.status='VERIFIED' WHERE oi.order_id=$1 AND oi.prescription_required=true AND mi.id IS NULL`,[id])).rows;if(missing.length)throw new ValidationError('Every prescription medicine requires verified directions before approval');const items=(await client.query('SELECT * FROM order_items WHERE order_id=$1 FOR UPDATE',[id])).rows;for(const item of items){const med=(await client.query('SELECT name,current_stock FROM medicines WHERE id=$1 FOR UPDATE',[item.medicine_id])).rows[0];const reserved=(await client.query(`SELECT COALESCE(SUM(quantity),0)::int total FROM inventory_reservations WHERE medicine_id=$1 AND status='ACTIVE' AND expires_at>NOW()`,[item.medicine_id])).rows[0].total;if(med.current_stock-reserved<item.requested_quantity)throw new ValidationError(`${med.name} is unavailable in the requested quantity`);await client.query(`UPDATE order_items SET approved_quantity=requested_quantity,approval_status='APPROVED' WHERE id=$1`,[item.id]);await client.query(`INSERT INTO inventory_reservations(order_item_id,medicine_id,quantity,expires_at) VALUES($1,$2,$3,NOW()+($4||' minutes')::interval) ON CONFLICT(order_item_id) DO UPDATE SET quantity=EXCLUDED.quantity,status='ACTIVE',expires_at=EXCLUDED.expires_at,released_at=NULL`,[item.id,item.medicine_id,item.requested_quantity,env.RESERVATION_MINUTES]);}}
    if(['CANCELLED','REJECTED_BY_PHARMACIST','REFUNDED'].includes(target))await client.query(`UPDATE inventory_reservations SET status='RELEASED',released_at=NOW() WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=$1) AND status='ACTIVE'`,[id]);
    if(target==='COMPLETED'){const reservations=(await client.query(`SELECT ir.*,m.current_stock FROM inventory_reservations ir JOIN medicines m ON m.id=ir.medicine_id WHERE ir.order_item_id IN (SELECT id FROM order_items WHERE order_id=$1) AND ir.status='ACTIVE' FOR UPDATE`,[id])).rows;for(const r of reservations){if(r.current_stock<r.quantity)throw new ValidationError('Inventory changed before fulfilment; completion is blocked');const next=r.current_stock-r.quantity;await client.query('UPDATE medicines SET current_stock=$1 WHERE id=$2',[next,r.medicine_id]);await client.query(`INSERT INTO stock_movements(medicine_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,performed_by) VALUES($1,'OUTBOUND',$2,$3,$4,'ORDER',$5,'Order completion',$6)`,[r.medicine_id,r.quantity,r.current_stock,next,id,user.userId]);await client.query(`UPDATE inventory_reservations SET status='CONSUMED',released_at=NOW() WHERE id=$1`,[r.id]);}}
    const updated=await repo.updateOrderStatus(client,id,target,['ADMIN','MANAGER','PHARMACIST'].includes(user.role)?user.userId:null);await repo.addHistory(client,{orderId:id,previousStatus:locked.status,newStatus:target,actorId:user.userId,actorRole:user.role,reason,internalNote,metadata:{}});return updated;})
    .then((updated) => {
    const notificationMap = {
      APPROVED_AWAITING_PATIENT_CONFIRMATION: ['ORDER_STATUS', 'Order approved', 'Your order is approved and waiting for your confirmation.'],
      APPROVED_AWAITING_PAYMENT: ['ORDER_STATUS', 'Order approved', 'Your order is approved. Please proceed to payment.'],
      PAYMENT_DEFERRED: ['ORDER_STATUS', 'Payment on pickup', 'Your order is confirmed. Payment will be collected at the pharmacy.'],
      PREPARING: ['ORDER_STATUS', 'Order being prepared', 'The pharmacy is preparing your order.'],
      READY_FOR_PICKUP: ['ORDER_STATUS', 'Order ready for pickup', 'Your order is ready for collection.'],
      OUT_FOR_DELIVERY: ['ORDER_STATUS', 'Order out for delivery', 'Your order is on its way to you.'],
      COMPLETED: ['ORDER_STATUS', 'Order completed', 'Your order has been completed. Thank you for choosing Urumuli Pharmacy.'],
      CLARIFICATION_REQUIRED: ['ORDER_ACTION', 'Clarification needed', 'The pharmacist needs more information to complete your order.'],
      PRESCRIBER_CLARIFICATION_REQUIRED: ['ORDER_ACTION', 'Prescriber clarification needed', 'The pharmacist has requested clarification from your prescriber.'],
      REJECTED_BY_PHARMACIST: ['ORDER_ACTION', 'Order not approved', 'The pharmacist could not approve your order.'],
      CANCELLED: ['ORDER_STATUS', 'Order cancelled', 'Your order has been cancelled.'],
      REFUNDED: ['ORDER_STATUS', 'Order refunded', 'Your order has been refunded.'],
    };
    const [type, title, message] = notificationMap[target] || [];
    if (updated && type) notifyOrderPatient(updated, { type, title, message });
    return updated;
  });
}

export async function saveInstruction(orderId,data,user){
  const order=await repo.findOrder(orderId);if(!order)throw new NotFoundError('Order',orderId);if(!['UNDER_PHARMACIST_REVIEW','CLARIFICATION_REQUIRED'].includes(order.status))throw new ValidationError('Directions can only be verified during pharmacist review');
  const items=await repo.getOrderItems(orderId);const item=items.find(x=>x.id===data.orderItemId);if(!item||!item.prescription_required)throw new ValidationError('Select a prescription-required item from this order');
  const errors=instructionErrors(data);if(errors.length)throw new ValidationError(errors[0],errors);
  const snapshot=item.medicine_snapshot;return transaction(async(client)=>{await client.query(`UPDATE medication_instructions SET status='SUPERSEDED',superseded_at=NOW() WHERE order_item_id=$1 AND status='VERIFIED'`,[item.id]);const version=(await client.query('SELECT COALESCE(MAX(version),0)+1 version FROM medication_instructions WHERE order_item_id=$1',[item.id])).rows[0].version;
    return (await client.query(`INSERT INTO medication_instructions(order_item_id,patient_identity_id,medicine_id,medicine_snapshot,strength,dosage_form,dispensed_quantity,quantity_per_dose,dose_unit,route,frequency_type,frequency_value,administration_times,duration_value,duration_unit,start_date,end_date,food_relationship,special_instructions,warnings,storage_instructions,missed_dose_instructions,prescriber_name,prescription_reference,pharmacist_id,version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,[item.id,order.patient_identity_id,item.medicine_id,snapshot,data.strength,data.dosageForm,data.dispensedQuantity,data.quantityPerDose,data.doseUnit,data.route,data.frequencyType,data.frequencyValue||null,JSON.stringify(data.administrationTimes),data.durationValue||null,data.durationUnit||null,data.startDate,data.endDate||null,data.foodRelationship||null,data.specialInstructions||null,data.warnings||null,data.storageInstructions||null,data.missedDoseInstructions||null,data.prescriberName||null,data.prescriptionReference||null,user.userId,version])).rows[0];});
}

function identifyPrescriptionFile(file) {
  const b=file.buffer;
  const ascii=(start,length)=>b.subarray(start,start+length).toString('ascii');
  if(ascii(0,5)==='%PDF-')return {mimeType:'application/pdf',extension:'.pdf'};
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return {mimeType:'image/jpeg',extension:'.jpg'};
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mimeType:'image/png',extension:'.png'};
  if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return {mimeType:'image/webp',extension:'.webp'};
  if(['GIF87a','GIF89a'].includes(ascii(0,6)))return {mimeType:'image/gif',extension:'.gif'};
  if(ascii(0,2)==='BM')return {mimeType:'image/bmp',extension:'.bmp'};
  if(b.subarray(0,4).equals(Buffer.from([0x49,0x49,0x2a,0x00]))||b.subarray(0,4).equals(Buffer.from([0x4d,0x4d,0x00,0x2a])))return {mimeType:'image/tiff',extension:'.tiff'};
  if(ascii(4,4)==='ftyp'&&['heic','heix','hevc','hevx','heim','heis','mif1','msf1'].includes(ascii(8,4)))return {mimeType:'image/heic',extension:'.heic'};
  if(b.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])))return {mimeType:'application/msword',extension:'.doc'};
  const originalExtension=path.extname(file.originalname||'').toLowerCase();
  if(b[0]===0x50&&b[1]===0x4b&&['.docx','.odt'].includes(originalExtension))return originalExtension==='.docx'
    ?{mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',extension:'.docx'}
    :{mimeType:'application/vnd.oasis.opendocument.text',extension:'.odt'};
  throw new ValidationError('Unsupported prescription file. Upload PDF, DOC, DOCX, ODT, JPG, PNG, WebP, GIF, BMP, TIFF, HEIC, or HEIF.');
}
export async function uploadPrescription(orderId,files,user){const order=await repo.findOrder(orderId);if(!order)throw new NotFoundError('Order',orderId);await assertOwner(order,user);if(order.status!==ORDER_STATUS.AWAITING_PRESCRIPTION&&order.status!==ORDER_STATUS.CLARIFICATION_REQUIRED)throw new ValidationError('This order is not accepting prescription files');if(!files?.length)throw new ValidationError('Choose at least one prescription file');
  const dir=path.resolve(env.UPLOAD_DIR,'prescriptions');await fs.mkdir(dir,{recursive:true});let prescription=await transaction(async(client)=>{let p=(await client.query('SELECT * FROM prescriptions WHERE order_id=$1',[order.id])).rows[0];if(!p)p=(await client.query(`INSERT INTO prescriptions(patient_name,patient_phone,doctor_name,status,patient_identity_id,order_id,uploaded_by) VALUES($1,$2,'Not provided','PENDING',$3,$4,$5) RETURNING *`,[order.patient_name?.trim()||'Verified patient',order.patient_phone,order.patient_identity_id,order.id,user.userId||null])).rows[0];return p;});const saved=[];
  for(const file of files){const detected=identifyPrescriptionFile(file);const key=`${crypto.randomUUID()}${detected.extension}`;const full=path.join(dir,key);await fs.writeFile(full,file.buffer,{flag:'wx'});saved.push(await repo.addPrescriptionFile({prescriptionId:prescription.id,storageKey:`prescriptions/${key}`,extension:detected.extension,mimeType:detected.mimeType,size:file.size,sha256:hash(file.buffer),uploadedBy:user.userId}));}
  await transitionOrder(order.id,ORDER_STATUS.SUBMITTED_FOR_REVIEW,user,{reason:'Prescription uploaded'});return saved;}

export async function getPrescriptionFile(fileId,user){const file=await repo.findPrescriptionFile(fileId);if(!file)throw new NotFoundError('Prescription file',fileId);const order=await repo.findOrder(file.order_id);await assertOwner(order,user);return {...file,absolutePath:path.resolve(env.UPLOAD_DIR,file.storage_key)};}

export async function startPayment(orderId,user,idempotencyKey,method){const order=await repo.findOrder(orderId);if(!order)throw new NotFoundError('Order',orderId);await assertOwner(order,user);if(order.status!==ORDER_STATUS.APPROVED_AWAITING_PAYMENT)throw new ValidationError('Payment is available only after approval and patient confirmation');if(!idempotencyKey)throw new ValidationError('Idempotency-Key header is required');
  if(method==='PAY_ON_PICKUP'){if(order.fulfilment_method!=='PICKUP')throw new ValidationError('Pay on pickup is available only for pickup orders');return transaction(async(client)=>{const prior=(await client.query(`SELECT response_body FROM idempotency_records WHERE scope='DEFER_PAYMENT' AND idempotency_key=$1 AND owner_key=$2`,[idempotencyKey,order.patient_identity_id])).rows[0];if(prior)return prior.response_body;await client.query(`UPDATE orders SET payment_method='PAY_ON_PICKUP',payment_status='DUE_ON_PICKUP',status='PAYMENT_DEFERRED' WHERE id=$1`,[order.id]);await repo.addHistory(client,{orderId:order.id,previousStatus:order.status,newStatus:'PAYMENT_DEFERRED',actorId:user.userId,actorRole:user.role,reason:'Patient selected pay on pickup'});const result={status:'PAYMENT_DEFERRED',paymentStatus:'DUE_ON_PICKUP',message:'Payment will be collected at the pharmacy.'};await client.query(`INSERT INTO idempotency_records(scope,idempotency_key,owner_key,response_status,response_body) VALUES('DEFER_PAYMENT',$1,$2,200,$3)`,[idempotencyKey,order.patient_identity_id,result]);return result;});}
  if(env.PAYMENT_PROVIDER==='development')return {status:'NOT_PROCESSED',providerConfigured:false,message:'Card and mobile-money payments are not configured. No charge was attempted.'};throw new ValidationError('Configured payment provider adapter is not available');}

export { orderTransitions as transitions };
