import { z } from 'zod';
import {
  addressSchema,
  bankDetailsSchema,
  phoneEntrySchema,
  emailEntrySchema,
  directorSchema,
  authorizedPersonSchema,
  createDirectorSchema,
  updateDirectorSchema,
  addAuthorizedPersonSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
} from '../../utils/shared-validation.js';

const retailerLicenseSchema = z.object({
  category: z.enum(['SEEDS', 'INSECTICIDE', 'FERTILIZER']),
  licenseNumber: z.string().optional(),
  validUptoDate: z.string().optional(),
});

export const createRetailerSchema = z
  .object({
    phone: z.string().length(10, 'Phone must be 10 digits').regex(/^\d+$/).optional(),
    phones: z.array(phoneEntrySchema).optional(),
    email: z.string().email().optional(),
    emails: z.array(emailEntrySchema).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    companyType: z.enum(['PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']),
    gstNumber: z.string().optional(),
    companyPan: z.string().optional(),
    isDraft: z.boolean().optional().default(false),
    address: addressSchema.optional(),
    bankDetails: bankDetailsSchema.optional(),
    licenses: z.array(retailerLicenseSchema).optional(),
    directors: z.array(directorSchema).optional(),
    authorizedPersons: z.array(authorizedPersonSchema).optional(),
  })
  .refine((d) => d.phone || (d.phones && d.phones.length > 0), {
    message: 'Admin phone or phones required',
    path: ['phone'],
  });

export const updateRetailerSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyType: z.enum(['PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']).optional(),
  gstNumber: z.string().optional(),
  companyPan: z.string().optional(),
  isDraft: z.boolean().optional(),
  address: addressSchema.optional(),
});

export const updateRetailerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'REJECTED', 'PENDING', 'DRAFT']),
  reason: z.string().optional(),
});

export const listRetailersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  search: z.string().optional(),
  companyType: z.enum(['PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']).optional(),
});

export const createRetailerLicenseSchema = z.object({
  category: z.enum(['SEEDS', 'INSECTICIDE', 'FERTILIZER']),
  licenseNumber: z.string().optional(),
  validUptoDate: z.string().optional(),
});

export const updateRetailerLicenseSchema = z.object({
  licenseNumber: z.string().optional(),
  validUptoDate: z.string().optional(),
});

export {
  createDirectorSchema,
  updateDirectorSchema,
  addAuthorizedPersonSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
};
