import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PaymentGateway, CreateOrderParams, VerifySignatureParams } from './payment.interface';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export class RazorpayGateway implements PaymentGateway {
  private razorpay: Razorpay;
  private keySecret: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new AppError('Razorpay credentials are not configured', 500);
    }

    this.keySecret = keySecret;
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(params: CreateOrderParams): Promise<{ gatewayOrderId: string; rawResponse: Record<string, unknown> }> {
    try {
      // Razorpay expects amount in subunits (paise for INR)
      const amountInSubunits = params.amount.mul(100).toNumber();
      
      const options = {
        amount: amountInSubunits,
        currency: params.currency || 'INR',
        receipt: params.orderId,
        notes: params.notes || {},
      };

      const order = await this.razorpay.orders.create(options);
      
      logger.info('payment.create', { provider: 'razorpay', orderId: params.orderId, gatewayOrderId: order.id });
      
      return {
        gatewayOrderId: order.id,
        rawResponse: order as unknown as Record<string, unknown>,
      };
    } catch (error: unknown) {
      logger.error('payment.create_failed', { provider: 'razorpay', orderId: params.orderId });
      throw new AppError('Failed to create Razorpay order', 502);
    }
  }

  async verifySignature(params: VerifySignatureParams): Promise<boolean> {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');

      const isValid = generatedSignature === params.signature;
      logger.info('payment.verify', { provider: 'razorpay', orderId: params.orderId, isValid });
      
      return isValid;
    } catch (error: unknown) {
      logger.error('payment.verify_failed', { provider: 'razorpay', orderId: params.orderId });
      return false;
    }
  }

  async refund(paymentId: string, amount?: Prisma.Decimal): Promise<{ status: string; rawResponse: Record<string, unknown> }> {
    try {
      const options = amount ? { amount: amount.mul(100).toNumber() } : {};
      const refundResponse = await this.razorpay.payments.refund(paymentId, options);
      
      logger.info('payment.refund', { provider: 'razorpay', paymentId });

      return {
        status: refundResponse.status,
        rawResponse: refundResponse as unknown as Record<string, unknown>,
      };
    } catch (error: unknown) {
      logger.error('payment.refund_failed', { provider: 'razorpay', paymentId });
      throw new AppError('Failed to process Razorpay refund', 502);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Razorpay has no /health endpoint, fetching an invalid order ID ensures credentials work
      // and network connects. If auth fails, it throws a 401 error. 
      await this.razorpay.orders.fetch('dummy_order_to_test_auth').catch((err: any) => {
        if (err?.statusCode === 401) throw err;
      });
      logger.info('payment.healthcheck', { provider: 'razorpay', status: 'healthy' });
      return true;
    } catch (error: unknown) {
      logger.error('payment.healthcheck', { provider: 'razorpay', status: 'unhealthy' });
      return false;
    }
  }
}
