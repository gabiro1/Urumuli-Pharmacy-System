import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array().min(1).max(30).items(Joi.object({ medicineId:Joi.string().uuid().required(), quantity:Joi.number().integer().min(1).max(99).required() })).required(),
  fulfilmentMethod:Joi.string().valid('PICKUP','DELIVERY').required(), deliveryAddress:Joi.when('fulfilmentMethod',{is:'DELIVERY',then:Joi.string().trim().min(10).max(1000).required(),otherwise:Joi.string().allow('',null)}),
  fullName:Joi.string().trim().min(2).max(200).required(), email:Joi.string().email().allow('',null), phone:Joi.string().pattern(/^\+?[0-9\s\-().]{9,20}$/).allow('',null), notificationChannel:Joi.string().valid('SMS','EMAIL','IN_APP').default('SMS'),
  paymentMethod:Joi.string().valid('CASH','CARD','MOBILE_MONEY','PAY_ON_PICKUP').required(), consent:Joi.boolean().valid(true).required(),
});
export const transitionSchema = Joi.object({ status:Joi.string().required(), reason:Joi.string().trim().max(1000), internalNote:Joi.string().trim().max(2000) });
export const instructionSchema = Joi.object({
  orderItemId:Joi.string().uuid().required(), strength:Joi.string().max(100).required(), dosageForm:Joi.string().max(100).required(),
  dispensedQuantity:Joi.number().positive().required(), quantityPerDose:Joi.number().positive().required(), doseUnit:Joi.string().max(40).required(), route:Joi.string().max(80).required(),
  frequencyType:Joi.string().valid('ONCE_DAILY','TWICE_DAILY','THREE_TIMES_DAILY','FOUR_TIMES_DAILY','EVERY_N_HOURS','AS_NEEDED','SPECIFIC_DAYS','CUSTOM').required(),
  frequencyValue:Joi.number().integer().positive(), administrationTimes:Joi.array().items(Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/)).default([]),
  durationValue:Joi.number().integer().positive(), durationUnit:Joi.string().valid('DAYS','WEEKS','MONTHS'), startDate:Joi.date().iso().required(), endDate:Joi.date().iso().min(Joi.ref('startDate')),
  foodRelationship:Joi.string().max(80).allow('',null), specialInstructions:Joi.string().max(2000).allow('',null), warnings:Joi.string().max(2000).allow('',null),
  storageInstructions:Joi.string().max(2000).allow('',null), missedDoseInstructions:Joi.string().max(2000).allow('',null), prescriberName:Joi.string().max(200).allow('',null), prescriptionReference:Joi.string().max(120).allow('',null),
  confirmations:Joi.object({
    reviewedOriginal:Joi.boolean().valid(true).required(),
    medicineMatches:Joi.boolean().valid(true).required(),
    directionsCorrect:Joi.boolean().valid(true).required(),
  }).required(),
  overrideReason:Joi.string().max(1000).allow('',null),
});
