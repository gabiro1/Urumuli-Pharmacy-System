import { sendSuccess, sendCreated } from '../../utils/response.js';
import * as salesService from './sales.service.js';

export async function listSales(req, res, next) {
  try {
    const result = await salesService.listSales(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getSale(req, res, next) {
  try {
    const sale = await salesService.getSale(req.params.id);
    return sendSuccess(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function getReceipt(req, res, next) {
  try {
    const sale = await salesService.getReceipt(req.params.id);
    return sendSuccess(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function getPrintableReceipt(req, res, next) {
  try {
    const html = await salesService.getPrintableReceipt(req.params.id);
    return res.set('Content-Type', 'text/html').send(html);
  } catch (error) {
    next(error);
  }
}

export async function createSale(req, res, next) {
  try {
    const sale = await salesService.createSale(req.body, req.user);
    return sendCreated(res, sale, 'Sale completed successfully');
  } catch (error) {
    next(error);
  }
}

export async function voidSale(req, res, next) {
  try {
    const sale = await salesService.voidSale(req.params.id, req.user);
    return sendSuccess(res, sale, 'Sale voided successfully');
  } catch (error) {
    next(error);
  }
}

export async function refundSale(req, res, next) {
  try {
    const sale = await salesService.refundSale(req.params.id, req.user);
    return sendSuccess(res, sale, 'Sale refunded successfully');
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req, res, next) {
  try {
    const summary = await salesService.getSummary(req.query);
    return sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}
