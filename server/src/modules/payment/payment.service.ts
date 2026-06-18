import { Prisma } from '@prisma/client';
import { PaymentGateway, CreateOrderParams, VerifySignatureParams } from './payment.interface';
import { RazorpayGateway } from './razorpay.gateway';
import { StripeGateway } from './stripe.gateway';
import { AppError } from '../../utils/AppError';

export class PaymentService {
  private gateway: PaymentGateway;

  constructor(provider: 'RAZORPAY' | 'STRIPE') {
    if (provider === 'RAZORPAY') {
      this.gateway = new RazorpayGateway();
    } else if (provider === 'STRIPE') {
      this.gateway = new StripeGateway();
    } else {
      throw new AppError('Unsupported payment provider', 400);
    }
  }

  async createOrder(params: CreateOrderParams) {
    return this.gateway.createOrder(params);
  }

  async verifySignature(params: VerifySignatureParams) {
    return this.gateway.verifySignature(params);
  }

  async refund(paymentId: string, amount?: Prisma.Decimal) {
    return this.gateway.refund(paymentId, amount);
  }

  async healthCheck() {
    return this.gateway.healthCheck();
  }
}
