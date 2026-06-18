import { describe, it, expect } from 'vitest';
import { StripeGateway } from '../src/modules/payment/stripe.gateway';
import { AppError } from '../src/shared/utils/AppError';
import { Prisma } from '@prisma/client';

describe('StripeGateway', () => {
  const gateway = new StripeGateway();

  it('throws AppError (NotImplemented) for createOrder', async () => {
    await expect(gateway.createOrder({ orderId: '1', amount: new Prisma.Decimal(100) }))
      .rejects.toThrow(AppError);
  });

  it('throws AppError (NotImplemented) for verifySignature', async () => {
    await expect(gateway.verifySignature({ orderId: '1', paymentId: '2', signature: '3' }))
      .rejects.toThrow(AppError);
  });

  it('throws AppError (NotImplemented) for refund', async () => {
    await expect(gateway.refund('1'))
      .rejects.toThrow(AppError);
  });

  it('throws AppError (NotImplemented) for healthCheck', async () => {
    await expect(gateway.healthCheck())
      .rejects.toThrow(AppError);
  });
});
