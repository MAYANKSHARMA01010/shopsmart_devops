import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from '../src/modules/checkout/checkout.service';
import prisma from '../src/shared/config/database';
import { Prisma } from '@prisma/client';

vi.mock('../src/shared/config/database', () => ({
  default: {
    cart: { findUnique: vi.fn() },
    address: { findUnique: vi.fn() },
    coupon: { findUnique: vi.fn() },
    payment: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock('../src/modules/payment/payment.service', () => ({
  PaymentService: class {
    createOrder = vi.fn().mockResolvedValue({ gatewayOrderId: 'gateway123', rawResponse: {} });
  }
}));

describe('CheckoutService unit tests', () => {
  let service: CheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckoutService();
  });

  it('throws if cart is empty', async () => {
    (prisma.cart.findUnique as any).mockResolvedValue(null);
    await expect(service.initializeCheckout({ userId: 'user1', addressId: 'addr1', gatewayProvider: 'RAZORPAY' }))
      .rejects.toThrow('Cart is empty');
  });

  it('throws if address is invalid', async () => {
    (prisma.cart.findUnique as any).mockResolvedValue({ items: [{ product: { basePrice: new Prisma.Decimal(100), stock: 10 }, quantity: 1 }] });
    (prisma.address.findUnique as any).mockResolvedValue(null);
    
    await expect(service.initializeCheckout({ userId: 'user1', addressId: 'addr1', gatewayProvider: 'RAZORPAY' }))
      .rejects.toThrow('Invalid address');
  });

  it('calculates totals and executes transaction', async () => {
    (prisma.cart.findUnique as any).mockResolvedValue({ 
      id: 'cart1',
      items: [{ productId: 'p1', quantity: 2, product: { name: 'Item', basePrice: new Prisma.Decimal(100), stock: 5 } }] 
    });
    (prisma.address.findUnique as any).mockResolvedValue({ userId: 'user1', id: 'addr1' });
    
    // mock transaction
    const txMock = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'p1', stock: 5 }]),
      product: { update: vi.fn() },
      order: { create: vi.fn().mockResolvedValue({ id: 'order1', totalAmount: new Prisma.Decimal(270) }) },
      orderAuditLog: { create: vi.fn() },
      cartItem: { deleteMany: vi.fn() }
    };
    
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(txMock));

    // mock payment record creation
    (prisma.payment.create as any).mockResolvedValue({ id: 'pay1' });

    const result = await service.initializeCheckout({ userId: 'user1', addressId: 'addr1', gatewayProvider: 'RAZORPAY' });

    expect(result.order.id).toBe('order1');
    expect(txMock.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: { stock: { decrement: 2 } }
    }));
  });

  it('throws Insufficient stock if db lock reveals lower stock', async () => {
    (prisma.cart.findUnique as any).mockResolvedValue({ 
      id: 'cart1',
      items: [{ productId: 'p1', quantity: 2, product: { name: 'Item', basePrice: new Prisma.Decimal(100), stock: 5 } }] 
    });
    (prisma.address.findUnique as any).mockResolvedValue({ userId: 'user1', id: 'addr1' });
    
    const txMock = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'p1', stock: 1 }]), 
    };
    
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(txMock));

    await expect(service.initializeCheckout({ userId: 'user1', addressId: 'addr1', gatewayProvider: 'RAZORPAY' }))
      .rejects.toThrow('Insufficient stock for product Item');
  });
});
