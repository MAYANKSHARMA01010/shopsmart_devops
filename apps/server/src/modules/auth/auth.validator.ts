import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, 'Username can only contain letters, numbers, underscores, dots, and hyphens')
    .optional(),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format').optional().nullable(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier (email or username) is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, 'Username can only contain letters, numbers, underscores, dots, and hyphens')
    .optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url('Invalid avatar URL').optional().nullable(),
  gender: z.string().optional().nullable(),
});

export const validateBody = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({ success: false, message: 'Invalid request payload' });
  }
};
