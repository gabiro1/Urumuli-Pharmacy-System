import * as partnersService from './partners.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export const listActivePartners = async (req, res, next) => {
  try {
    const result = await partnersService.getActivePartners();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const listAllPartners = async (req, res, next) => {
  try {
    const result = await partnersService.getAllPartners(req.query);
    sendSuccess(res, result.data, 'Success', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await partnersService.getPartnerById(id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const createPartner = async (req, res, next) => {
  try {
    const result = await partnersService.createPartner(req.body);
    sendCreated(res, result);
  } catch (err) {
    next(err);
  }
};

export const updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await partnersService.updatePartner(id, req.body);
    sendSuccess(res, result, 'Partner updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deletePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await partnersService.deletePartner(id);
    sendSuccess(res, null, 'Partner deleted successfully');
  } catch (err) {
    next(err);
  }
};
