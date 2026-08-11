export const orderTransitions = Object.freeze({
  AWAITING_PRESCRIPTION:['SUBMITTED_FOR_REVIEW','CANCELLED'], SUBMITTED_FOR_REVIEW:['UNDER_PHARMACIST_REVIEW','CANCELLED'],
  UNDER_PHARMACIST_REVIEW:['CLARIFICATION_REQUIRED','PRESCRIBER_CLARIFICATION_REQUIRED','APPROVED_AWAITING_PATIENT_CONFIRMATION','REJECTED_BY_PHARMACIST','CANCELLED'],
  CLARIFICATION_REQUIRED:['SUBMITTED_FOR_REVIEW','CANCELLED'], PRESCRIBER_CLARIFICATION_REQUIRED:['UNDER_PHARMACIST_REVIEW','REJECTED_BY_PHARMACIST'],
  APPROVED_AWAITING_PATIENT_CONFIRMATION:['APPROVED_AWAITING_PAYMENT','CANCELLED'], APPROVED_AWAITING_PAYMENT:['PAYMENT_PROCESSING','CANCELLED'],
  PAYMENT_PROCESSING:['PAYMENT_RECEIVED','APPROVED_AWAITING_PAYMENT','CANCELLED'], PAYMENT_RECEIVED:['PREPARING','REFUND_PENDING'], PAYMENT_DEFERRED:['PREPARING','CANCELLED'],
  PREPARING:['READY_FOR_PICKUP','OUT_FOR_DELIVERY','REFUND_PENDING'], READY_FOR_PICKUP:['COMPLETED','CANCELLED'], OUT_FOR_DELIVERY:['COMPLETED','CANCELLED'], REFUND_PENDING:['REFUNDED'],
});
export const canTransition=(from,to)=>(orderTransitions[from]||[]).includes(to);
export function instructionErrors(data){const errors=[];const expected={ONCE_DAILY:1,TWICE_DAILY:2,THREE_TIMES_DAILY:3,FOUR_TIMES_DAILY:4}[data.frequencyType];if(Number(data.quantityPerDose)<=0)errors.push('Dose must be greater than zero');if(!data.route?.trim())errors.push('Route is required');if(expected&&data.administrationTimes?.length!==expected)errors.push(`${data.frequencyType} requires ${expected} administration time(s)`);if(data.endDate&&new Date(data.endDate)<new Date(data.startDate))errors.push('End date cannot be before start date');if(data.frequencyType==='EVERY_N_HOURS'&&!data.frequencyValue)errors.push('An hour interval is required');if(data.frequencyType==='AS_NEEDED'&&!data.specialInstructions?.trim())errors.push('As-needed directions require a documented maximum-use limitation');return errors;}
