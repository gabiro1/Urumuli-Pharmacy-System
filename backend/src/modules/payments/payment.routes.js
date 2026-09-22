import { Router } from 'express';
import express from 'express';
import { settleFromWebhook } from '../orders/orders.service.js';

const router = Router();

// Raw body is required so webhook signatures are verified against the exact
// bytes the provider sent, not a re-serialized body object.
router.post('/webhook/:provider', express.raw({ type: '*/*' }), async (req, res, next) => {
  try {
    const rawBody = req.body.toString('utf8');
    const result = await settleFromWebhook(req.params.provider, rawBody, req.headers);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Unknown payment reference' });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;