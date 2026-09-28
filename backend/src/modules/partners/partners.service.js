import * as partnersRepository from './partners.repository.js';
import { parsePagination } from '../../utils/pagination.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { cacheRemember, invalidatePartnerCache } from '../../services/redis.service.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';

export const getActivePartners = async () => {
  return cacheRemember('partners:active', 600, async () => {
    return partnersRepository.listActivePartners();
  });
};

export const getAllPartners = async (queryParams) => {
  const { limit, offset } = parsePagination(queryParams);
  const filters = {
    search: queryParams.search || null,
    partnerType: queryParams.partnerType || null,
    isActive: queryParams.isActive !== undefined ? queryParams.isActive : null,
    limit,
    offset,
  };
  const { rows, total } = await partnersRepository.listAllPartners(filters);
  return {
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPartnerById = async (id) => {
  const partner = await partnersRepository.findPartnerById(id);
  if (!partner) {
    throw new NotFoundError(`Partner with id ${id} not found`);
  }
  return partner;
};

export const createPartner = async (data) => {
  const result = await partnersRepository.createPartner(data);
  await invalidatePartnerCache();
  return result;
};

export const updatePartner = async (id, data) => {
  const existing = await partnersRepository.findPartnerById(id);
  if (!existing) {
    throw new NotFoundError(`Partner with id ${id} not found`);
  }
  const result = await partnersRepository.updatePartner(id, data);
  await invalidatePartnerCache();
  return result;
};

export const deletePartner = async (id) => {
  const existing = await partnersRepository.findPartnerById(id);
  if (!existing) {
    throw new NotFoundError(`Partner with id ${id} not found`);
  }
  const result = await partnersRepository.deletePartner(id);
  await invalidatePartnerCache();
  return result;
};

export const uploadPartnerLogo = async (file) => {
  if (!file) throw new ValidationError('A logo file is required');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    throw new ValidationError('Unsupported file type. Use JPG, PNG, or WEBP.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError('Logo is too large. Maximum size is 5 MB.');
  }
  const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
  const relativePath = `partners/${randomUUID()}.${extension}`;
  const target = path.resolve(env.UPLOAD_DIR, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.buffer);
  return { logoUrl: `/uploads/${relativePath}` };
};
