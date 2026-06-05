import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.coerce.number().positive('Price must be a positive number'),
  comparePrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0, 'Stock must be non-negative').default(0),
  sku: z.string().max(100).optional().nullable(),
  images: z.array(z.string().url('Invalid image URL')).default([]),
  isVisible: z.boolean().default(true),
  categoryId: z.string().uuid('Invalid category ID'),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
});

export const updateProductSchema = productSchema.partial();

export const validateProduct = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    return res.status(400).json({
      status: 'fail',
      errors: error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
};
