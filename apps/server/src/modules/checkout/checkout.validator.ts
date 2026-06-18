import { z } from 'zod';
import { PaymentGatewayProvider } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

export const checkoutInitSchema = z.object({
  addressId: z.string().uuid('Valid Address ID is required'),
  gatewayProvider: z.nativeEnum(PaymentGatewayProvider, {
    errorMap: () => ({ message: 'Invalid payment gateway provider' })
  }),
  couponCode: z.string().optional(),
  notes: z.string().optional()
});

export const validateCheckoutBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = checkoutInitSchema.parse(req.body);
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
