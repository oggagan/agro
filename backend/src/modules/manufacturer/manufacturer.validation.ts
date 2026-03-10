import { z } from 'zod';
import {
  addressSchema,
  bankDetailsSchema,
  phoneEntrySchema,
  emailEntrySchema,
  directorSchema,
  authorizedPersonSchema,
  addAuthorizedPersonSchema as sharedAddAuthorizedPersonSchema,
  createDirectorSchema,
  updateDirectorSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
} from '../../utils/shared-validation.js';

export const createManufacturerSchema = z
  .object({
    phone: z.string().length(10, 'Phone must be 10 digits').regex(/^\d+$/).optional(),
    phones: z.array(phoneEntrySchema).optional(),
    email: z.string().email().optional(),
    emails: z.array(emailEntrySchema).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    companyType: z.enum(['LIMITED', 'PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']),
    licenseNumber: z.string().optional(),
    licenseValidUpto: z.string().optional(),
    gstNumber: z.string().optional(),
    udyogAadhaar: z.string().optional(),
    companyPan: z.string().optional(),
    registrationNumber: z.string().optional(),
    isDraft: z.boolean().optional().default(false),
    address: addressSchema.optional(),
    bankDetails: bankDetailsSchema.optional(),
    directors: z.array(directorSchema).optional(),
    authorizedPersons: z.array(authorizedPersonSchema).optional(),
  })
  .refine((d) => d.phone || (d.phones && d.phones.length > 0), {
    message: 'Admin phone or phones required',
    path: ['phone'],
  });

export const addAuthorizedPersonSchema = sharedAddAuthorizedPersonSchema;

export const updateManufacturerSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyType: z.enum(['LIMITED', 'PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']).optional(),
  licenseNumber: z.string().optional(),
  licenseValidUpto: z.string().optional(),
  gstNumber: z.string().optional(),
  udyogAadhaar: z.string().optional(),
  companyPan: z.string().optional(),
  registrationNumber: z.string().optional(),
  canAddEditProducts: z.boolean().optional(),
  canManageBatch: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  address: addressSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
});

export const updateManufacturerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'REJECTED', 'PENDING', 'DRAFT']),
  reason: z.string().optional(),
});

export { createDirectorSchema, updateDirectorSchema, updateAuthorizedPersonSchema, updateBankDetailsSchema };

export const listManufacturersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  search: z.string().optional(),
});
