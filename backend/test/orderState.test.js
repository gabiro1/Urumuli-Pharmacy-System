import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition,instructionErrors } from '../src/modules/orders/orderState.js';

test('prescription request cannot bypass pharmacist review',()=>assert.equal(canTransition('AWAITING_PRESCRIPTION','APPROVED_AWAITING_PAYMENT'),false));
test('payment cannot start before patient confirmation',()=>assert.equal(canTransition('UNDER_PHARMACIST_REVIEW','PAYMENT_PROCESSING'),false));
test('valid review progression is accepted',()=>assert.equal(canTransition('SUBMITTED_FOR_REVIEW','UNDER_PHARMACIST_REVIEW'),true));
test('invalid terminal transition is rejected',()=>assert.equal(canTransition('COMPLETED','PREPARING'),false));
test('zero dose is rejected',()=>assert.ok(instructionErrors({quantityPerDose:0,route:'mouth',frequencyType:'CUSTOM',administrationTimes:[],startDate:'2026-01-01'}).length));
test('missing route is rejected',()=>assert.ok(instructionErrors({quantityPerDose:1,route:'',frequencyType:'CUSTOM',administrationTimes:[],startDate:'2026-01-01'}).includes('Route is required')));
test('frequency and times must agree',()=>assert.ok(instructionErrors({quantityPerDose:1,route:'mouth',frequencyType:'TWICE_DAILY',administrationTimes:['08:00'],startDate:'2026-01-01'}).length));
test('as-needed directions require a maximum-use limitation',()=>assert.ok(instructionErrors({quantityPerDose:1,route:'mouth',frequencyType:'AS_NEEDED',administrationTimes:[],startDate:'2026-01-01',specialInstructions:''}).length));
test('contradictory dates are rejected',()=>assert.ok(instructionErrors({quantityPerDose:1,route:'mouth',frequencyType:'CUSTOM',administrationTimes:[],startDate:'2026-02-01',endDate:'2026-01-01'}).length));
