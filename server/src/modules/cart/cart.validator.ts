import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const addToCartSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product ID format." }),
  quantity: z.number().int().positive({ message: "Quantity must be at least 1." })
    .max(10, { message: "Maximum quantity per item in a cart is 10." }),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive({ message: "Quantity must be at least 1." })
    .max(10, { message: "Maximum quantity per item in a cart is 10." }),
});

export const mergeCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid({ message: "Invalid product ID format." }),
      quantity: z.number().int().positive({ message: "Quantity must be at least 1." })
        .max(10, { message: "Maximum quantity per item in a cart is 10." }),
    })
  )
  .max(50, { message: "Cannot merge guest cart containing more than 50 unique items." }),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product ID parameter." }),
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
    return res.status(400).json({ success: false, message: 'Invalid request parameters' });
  }
};
