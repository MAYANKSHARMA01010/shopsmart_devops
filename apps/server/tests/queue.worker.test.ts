import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPaymentWebhookJob } from '../src/workers/paymentWebhook.worker';
import prisma from '../src/shared/config/database';
import { OrderStatus, PaymentTransactionStatus } from '@prisma/client';

vi.mock('../src/shared/config/database', () => ({
  default: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    orderAuditLog: {
      create: vi.fn()
    },
    processedWebhook: {
      update: vi.fn()
    },
    $transaction: vi.fn(async (ops) => {
       for (const op of ops) { await op; }
    })
  }
}));

describe('Payment Webhook Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores non-RAZORPAY gateways', async () => {
    await processPaymentWebhookJob({ data: { gateway: 'STRIPE', eventId: '1', payload: {} } });
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it('processes payment.captured and confirms order', async () => {
    (prisma.payment.findUnique as any).mockResolvedValue({ id: 'pay1', orderId: 'ord1' });
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'ord1', status: OrderStatus.PENDING });
    
    await processPaymentWebhookJob({
      data: {
        eventId: 'evt1',
        gateway: 'RAZORPAY',
        payload: {
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'razor1', order_id: 'razor_ord1' } } }
        }
      }
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay1' },
      data: { status: PaymentTransactionStatus.CAPTURED, gatewayPaymentId: 'razor1' }
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'ord1' },
      data: { status: OrderStatus.CONFIRMED }
    });

    expect(prisma.processedWebhook.update).toHaveBeenCalledWith({
      where: { id: 'evt1' },
      data: { status: 'PROCESSED' }
    });
  });

  it('processes payment.failed and cancels order', async () => {
    (prisma.payment.findUnique as any).mockResolvedValue({ id: 'pay1', orderId: 'ord1' });
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'ord1', status: OrderStatus.PENDING });
    
    await processPaymentWebhookJob({
      data: {
        eventId: 'evt1',
        gateway: 'RAZORPAY',
        payload: {
          event: 'payment.failed',
          payload: { payment: { entity: { id: 'razor1', order_id: 'razor_ord1' } } }
        }
      }
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay1' },
      data: { status: PaymentTransactionStatus.FAILED }
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'ord1' },
      data: { status: OrderStatus.CANCELLED }
    });
  });
});
