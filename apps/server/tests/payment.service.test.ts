import { describe, it, expect, vi } from 'vitest';
import { PaymentService } from '../src/modules/payment/payment.service';
import { AppError } from '../src/shared/utils/AppError';

vi.mock('../src/modules/payment/razorpay.gateway', () => {
  return {
    RazorpayGateway: class {
      createOrder = vi.fn().mockResolvedValue({ gatewayOrderId: 'order_123', rawResponse: {} });
      verifySignature = vi.fn().mockResolvedValue(true);
      refund = vi.fn().mockResolvedValue({ status: 'processed', rawResponse: {} });
      healthCheck = vi.fn().mockResolvedValue(true);
    }
  };
});

describe('PaymentService', () => {
  it('resolves RAZORPAY provider successfully', () => {
    const service = new PaymentService('RAZORPAY');
    expect(service).toBeDefined();
  });

  it('throws AppError for unsupported STRIPE implementation', async () => {
    const service = new PaymentService('STRIPE');
    await expect(service.healthCheck()).rejects.toThrow(AppError);
    await expect(service.healthCheck()).rejects.toThrow('Stripe integration is not implemented');
  });

  it('throws AppError for unknown provider', () => {
    // @ts-expect-error testing invalid input
    expect(() => new PaymentService('PAYPAL')).toThrow(AppError);
  });
});
