import { z } from 'zod';

const addressSchema = z.object({
  address1: z.string().min(1, 'Address line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits').regex(/^\d+$/, 'Pincode must contain only digits'),
});

const bankDetailsSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().length(11, 'IFSC code must be 11 characters'),
  bankName: z.string().min(1, 'Bank name is required'),
});

const phoneEntrySchema = z.object({ number: z.string().length(10).regex(/^\d+$/), isPrimary: z.boolean().optional(), label: z.string().optional() });
const emailEntrySchema = z.object({ address: z.string().email(), isPrimary: z.boolean().optional(), label: z.string().optional() });

const directorSchemaBase = z.object({
  type: z.enum(['DIRECTOR', 'PARTNER', 'PROPRIETOR']),
  name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  phone: z.string().length(10, 'Phone must be 10 digits').regex(/^\d+$/).optional(),
  phones: z.array(phoneEntrySchema).optional(),
  email: z.string().email().optional(),
  emails: z.array(emailEntrySchema).optional(),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits').regex(/^\d+$/).optional(),
  panNumber: z.string().length(10, 'PAN must be 10 characters').optional(),
});
const directorSchema = directorSchemaBase.refine((d) => d.phone || (d.phones && d.phones.length > 0), { message: 'Phone or phones required', path: ['phone'] });

const authorizedPersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().length(10).regex(/^\d+$/).optional(),
  phones: z.array(phoneEntrySchema).optional(),
  email: z.string().email().optional(),
  emails: z.array(emailEntrySchema).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  aadhaarNumber: z.string().length(12).regex(/^\d+$/).optional(),
}).refine((d) => d.phone || (d.phones && d.phones.length > 0), { message: 'Phone or phones required', path: ['phone'] });

export const createManufacturerSchema = z.object({
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
  isDraft: z.boolean().optional().default(false),
  address: addressSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
  directors: z.array(directorSchema).optional(),
  authorizedPersons: z.array(authorizedPersonSchema).optional(),
}).refine((d) => d.phone || (d.phones && d.phones.length > 0), { message: 'Admin phone or phones required', path: ['phone'] });

export const addAuthorizedPersonSchema = authorizedPersonSchema;

export const updateManufacturerSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyType: z.enum(['LIMITED', 'PVT_LTD', 'PROPRIETORSHIP', 'PARTNERSHIP']).optional(),
  licenseNumber: z.string().optional(),
  licenseValidUpto: z.string().optional(),
  gstNumber: z.string().optional(),
  udyogAadhaar: z.string().optional(),
  companyPan: z.string().optional(),
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

export const createDirectorSchema = directorSchema;
export const updateDirectorSchema = directorSchemaBase.partial();
export const updateAuthorizedPersonSchema = z.object({
  name: z.string().min(1).optional(),
  phones: z.array(phoneEntrySchema).optional(),
  emails: z.array(emailEntrySchema).optional(),
  aadhaarNumber: z.string().length(12).regex(/^\d+$/).optional().nullable(),
}).partial();
export const updateBankDetailsSchema = bankDetailsSchema;

export const listManufacturersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  search: z.string().optional(),
});
