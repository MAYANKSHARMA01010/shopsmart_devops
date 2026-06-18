import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RazorpayGateway } from '../src/modules/payment/razorpay.gateway';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// Prevent actual network calls to Razorpay
const mockCreate = vi.fn();
const mockFetch = vi.fn();
const mockRefund = vi.fn();

vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      orders: {
        create: mockCreate,
        fetch: mockFetch,
      },
      payments: {
        refund: mockRefund,
      }
    }))
  };
});

describe('RazorpayGateway', () => {
  let gateway: RazorpayGateway;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'test_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
    vi.clearAllMocks();
    gateway = new RazorpayGateway();
  });

  it('throws error if credentials are missing', () => {
    delete process.env.RAZORPAY_KEY_ID;
    expect(() => new RazorpayGateway()).toThrow('Razorpay credentials are not configured');
  });

  it('createOrder serializes Prisma.Decimal amounts properly to subunits', async () => {
    mockCreate.mockResolvedValue({ id: 'order_123', status: 'created' });

    const amount = new Prisma.Decimal('15.50');
    const res = await gateway.createOrder({ orderId: 'receipt_1', amount });
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1550, // 15.50 * 100
      receipt: 'receipt_1',
      currency: 'INR'
    }));
    expect(res.gatewayOrderId).toBe('order_123');
  });

  it('verifySignature succeeds with correct HMAC', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const secret = 'test_secret';
    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    
    const isValid = await gateway.verifySignature({ orderId, paymentId, signature });
    expect(isValid).toBe(true);
  });
  
  it('verifySignature fails with incorrect HMAC', async () => {
    const isValid = await gateway.verifySignature({ orderId: 'o1', paymentId: 'p1', signature: 'invalid' });
    expect(isValid).toBe(false);
  });

  it('refund serializes Decimal amounts properly', async () => {
    mockRefund.mockResolvedValue({ status: 'processed' });
    
    const amount = new Prisma.Decimal('5.25');
    const res = await gateway.refund('pay_123', amount);
    
    expect(mockRefund).toHaveBeenCalledWith('pay_123', { amount: 525 });
    expect(res.status).toBe('processed');
  });
});
