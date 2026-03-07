import { z } from 'zod';

export const addressSchema = z.object({
  address1: z.string().min(1, 'Address line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits').regex(/^\d+$/, 'Pincode must contain only digits'),
});

export const bankDetailsSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().length(11, 'IFSC code must be 11 characters'),
  bankName: z.string().min(1, 'Bank name is required'),
});

export const phoneEntrySchema = z.object({
  number: z.string().length(10).regex(/^\d+$/),
  isPrimary: z.boolean().optional(),
  label: z.string().optional(),
});
export const emailEntrySchema = z.object({
  address: z.string().email(),
  isPrimary: z.boolean().optional(),
  label: z.string().optional(),
});

export const directorSchemaBase = z.object({
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
export const directorSchema = directorSchemaBase.refine(
  (d) => d.phone || (d.phones && d.phones.length > 0),
  { message: 'Phone or phones required', path: ['phone'] }
);

export const authorizedPersonSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().length(10).regex(/^\d+$/).optional(),
    phones: z.array(phoneEntrySchema).optional(),
    email: z.string().email().optional(),
    emails: z.array(emailEntrySchema).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    aadhaarNumber: z.string().length(12).regex(/^\d+$/).optional(),
  })
  .refine((d) => d.phone || (d.phones && d.phones.length > 0), {
    message: 'Phone or phones required',
    path: ['phone'],
  });

export const createDirectorSchema = directorSchema;
export const updateDirectorSchema = directorSchemaBase.partial();
export const addAuthorizedPersonSchema = authorizedPersonSchema;
export const updateAuthorizedPersonSchema = z
  .object({
    name: z.string().min(1).optional(),
    phones: z.array(phoneEntrySchema).optional(),
    emails: z.array(emailEntrySchema).optional(),
    aadhaarNumber: z.string().length(12).regex(/^\d+$/).optional().nullable(),
  })
  .partial();
export const updateBankDetailsSchema = bankDetailsSchema;
