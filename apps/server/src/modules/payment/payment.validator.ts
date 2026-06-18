import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1)
  })
});

export const validateVerifyBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = verifyPaymentSchema.shape.body.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Invalid payload', errors: error.errors });
  }
};
