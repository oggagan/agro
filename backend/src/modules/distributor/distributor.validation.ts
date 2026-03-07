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

const distributorTypeEnum = z.enum(['STATE_DISTRIBUTOR', 'UNDER_MANUFACTURER', 'UNDER_RETAILER']);

const distributorLicenseSchema = z.object({
  category: z.enum(['SEEDS', 'INSECTICIDE', 'FERTILIZER']),
  licenseNumber: z.string().optional(),
  validUptoDate: z.string().optional(),
});

const createDistributorBase = z.object({
  distributorType: distributorTypeEnum,
  phone: z.string().length(10, 'Phone must be 10 digits').regex(/^\d+$/).optional(),
  phones: z.array(phoneEntrySchema).optional(),
  email: z.string().email().optional(),
  emails: z.array(emailEntrySchema).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  gstNumber: z.string().optional(),
  address: addressSchema.optional(),
  isDraft: z.boolean().optional().default(false),
  // State / Under Manufacturer: single license
  licenseNumber: z.string().optional(),
  licenseValidUpto: z.string().optional(),
  // Under Manufacturer
  manufacturerId: z.string().uuid().optional(),
  // Under Retailer
  retailerId: z.string().uuid().optional(),
  companyName: z.string().optional(),
  companyType: z.enum(['PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']).optional(),
  companyPan: z.string().optional(),
  licenses: z.array(distributorLicenseSchema).optional(),
  directors: z.array(directorSchema).optional(),
  authorizedPersons: z.array(authorizedPersonSchema).optional(),
  bankDetails: bankDetailsSchema.optional(),
}).refine((d) => d.phone || (d.phones && d.phones.length > 0), {
  message: 'Admin phone or phones required',
  path: ['phone'],
});

export const createDistributorSchema = createDistributorBase.superRefine((data, ctx) => {
  if (data.distributorType === 'STATE_DISTRIBUTOR' || data.distributorType === 'UNDER_MANUFACTURER') {
    if (!data.authorizedPersons || data.authorizedPersons.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'At least one authorized person is required', path: ['authorizedPersons'] });
    }
  }
  if (data.distributorType === 'UNDER_MANUFACTURER') {
    if (!data.manufacturerId) {
      ctx.addIssue({ code: 'custom', message: 'Manufacturer is required', path: ['manufacturerId'] });
    }
  }
  if (data.distributorType === 'UNDER_RETAILER') {
    if (!data.retailerId) {
      ctx.addIssue({ code: 'custom', message: 'Retailer is required', path: ['retailerId'] });
    }
    if (!data.companyName || !data.companyType) {
      if (!data.companyName) ctx.addIssue({ code: 'custom', message: 'Company name is required', path: ['companyName'] });
      if (!data.companyType) ctx.addIssue({ code: 'custom', message: 'Company type is required', path: ['companyType'] });
    }
  }
});

export const updateDistributorSchema = z.object({
  gstNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  licenseValidUpto: z.string().optional().nullable(),
  manufacturerId: z.string().uuid().optional().nullable(),
  retailerId: z.string().uuid().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyType: z.enum(['PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED']).optional().nullable(),
  companyPan: z.string().optional().nullable(),
  isDraft: z.boolean().optional(),
  address: addressSchema.optional(),
});

export const updateDistributorStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'REJECTED', 'PENDING', 'DRAFT']),
  reason: z.string().optional(),
});

export const listDistributorsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  search: z.string().optional(),
  distributorType: distributorTypeEnum.optional(),
});

export const createDistributorLicenseSchema = z.object({
  category: z.enum(['SEEDS', 'INSECTICIDE', 'FERTILIZER']),
  licenseNumber: z.string().optional(),
  validUptoDate: z.string().optional(),
});

export const updateDistributorLicenseSchema = z.object({
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
