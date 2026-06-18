import { Request, Response } from 'express';
import crypto from 'crypto';
import { AppError } from '../../shared/utils/AppError';
import { catchAsync } from '../../shared/utils/catchAsync';
import { enqueueWebhook } from '../../queues/paymentWebhook.queue';
import prisma from '../../shared/config/database';
import logger from '../../shared/utils/logger';

export const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_API_SECRET || 'secret';
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new AppError('Invalid payment signature', 400);
  }

  // We rely on Webhook for fulfillment logic
  res.status(200).json({ success: true, message: 'Payment signature verified locally' });
});

export const handleRazorpayWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError('Raw body is missing. Ensure express.raw() is configured.', 500);
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

  if (expectedSignature !== signature) {
    logger.error('Invalid Razorpay webhook signature', { expectedSignature, signature });
    throw new AppError('Invalid webhook signature', 400);
  }

  const payload = JSON.parse(req.body.toString());
  // Razorpay headers usually omit `x-razorpay-event-id` or include it, fallback to payload body id
  const eventId = (req.headers['x-razorpay-event-id'] as string) || payload.id || crypto.randomUUID();

  if (!eventId) {
    throw new AppError('Missing event ID', 400);
  }

  try {
    await prisma.processedWebhook.create({
      data: {
        id: eventId,
        gateway: 'RAZORPAY',
        status: 'RECEIVED'
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.info('Duplicate webhook skipped', { eventId });
      res.status(200).json({ success: true, message: 'Webhook already processed' });
      return;
    }
    throw error;
  }

  await enqueueWebhook(eventId, 'RAZORPAY', payload);

  res.status(200).json({ success: true, message: 'Webhook enqueued' });
});
