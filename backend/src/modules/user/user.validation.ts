import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'REJECTED', 'PENDING', 'DRAFT']),
  reason: z.string().optional(),
});

const phoneEntrySchema = z.object({
  number: z.string().length(10).regex(/^\d+$/),
  isPrimary: z.boolean().optional(),
  label: z.string().optional(),
});
const emailEntrySchema = z.object({
  address: z.string().email(),
  isPrimary: z.boolean().optional(),
  label: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phones: z.array(phoneEntrySchema).optional(),
  emails: z.array(emailEntrySchema).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const listUsersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  role: z.enum(['SUPER_ADMIN', 'MANUFACTURER', 'AUTHORIZED_PERSON', 'DIRECTOR']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  search: z.string().optional(),
});
