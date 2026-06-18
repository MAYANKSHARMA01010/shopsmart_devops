import { Prisma } from '@prisma/client';
import { PaymentGateway, CreateOrderParams, VerifySignatureParams } from './payment.interface';
import { AppError } from '../../utils/AppError';

export class StripeGateway implements PaymentGateway {
  async createOrder(params: CreateOrderParams): Promise<{ gatewayOrderId: string; rawResponse: Record<string, unknown> }> {
    throw new AppError('Stripe integration is not implemented', 501);
  }

  async verifySignature(params: VerifySignatureParams): Promise<boolean> {
    throw new AppError('Stripe integration is not implemented', 501);
  }

  async refund(paymentId: string, amount?: Prisma.Decimal): Promise<{ status: string; rawResponse: Record<string, unknown> }> {
    throw new AppError('Stripe integration is not implemented', 501);
  }

  async healthCheck(): Promise<boolean> {
    throw new AppError('Stripe integration is not implemented', 501);
  }
}
