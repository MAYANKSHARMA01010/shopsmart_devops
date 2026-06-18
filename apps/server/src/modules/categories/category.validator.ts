import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const slugRegex = /^[a-z0-9-]+$/;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().regex(slugRegex, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().url('Invalid image URL').optional().nullable(),
  parentId: z.string().uuid('Invalid parent ID').optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
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

    return res.status(400).json({
      success: false,
      message: 'Invalid request payload',
      errors: [{ field: 'body', message: 'Invalid request payload' }],
    });
  }
};

export const validateParams = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.params = schema.parse(req.params);
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

    return res.status(400).json({
      success: false,
      message: 'Invalid request parameters',
      errors: [{ field: 'params', message: 'Invalid request parameters' }],
    });
  }
};
