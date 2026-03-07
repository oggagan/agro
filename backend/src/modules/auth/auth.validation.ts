import { z } from 'zod';

export const registerSchema = z.object({
  phone: z.string().length(10, 'Phone must be exactly 10 digits').regex(/^\d+$/, 'Phone must contain only digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional(),
});

export const loginSchema = z
  .object({
    phone: z.string().length(10, 'Phone must be exactly 10 digits').regex(/^\d+$/, 'Phone must contain only digits').optional(),
    email: z.string().email('Invalid email').optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => !!data.phone || !!data.email, { message: 'Phone or email is required', path: ['phone'] });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
