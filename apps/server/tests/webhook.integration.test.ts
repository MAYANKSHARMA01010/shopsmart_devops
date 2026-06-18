import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import app from '../src/server';
import prisma from '../src/shared/config/database';
import { enqueueWebhook } from '../src/queues/paymentWebhook.queue';

vi.mock('../src/queues/paymentWebhook.queue', () => ({
  enqueueWebhook: vi.fn()
}));

vi.mock('../src/shared/config/database', () => ({
  default: {
    processedWebhook: {
      create: vi.fn()
    },
    $queryRaw: vi.fn()
  }
}));

describe('Webhook API', () => {
  const secret = 'test-secret';
  
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    vi.clearAllMocks();
  });

  const generateSignature = (payload: any) => {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  };

  it('rejects invalid signature', async () => {
    const payload = { event: 'payment.captured' };
    const res = await request(app)
      .post('/api/v1/payment/webhook')
      .set('x-razorpay-signature', 'invalid-signature')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid webhook signature');
  });

  it('accepts valid signature and enqueues job', async () => {
    const payload = { id: 'evt_valid', event: 'payment.captured' };
    const signature = generateSignature(payload);
    
    (prisma.processedWebhook.create as any).mockResolvedValue({ id: 'evt_valid' });

    const res = await request(app)
      .post('/api/v1/payment/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Webhook enqueued');
    expect(enqueueWebhook).toHaveBeenCalledWith('evt_valid', 'RAZORPAY', payload);
  });

  it('handles duplicate webhooks gracefully', async () => {
    const payload = { id: 'evt_dup', event: 'payment.captured' };
    const signature = generateSignature(payload);
    
    (prisma.processedWebhook.create as any).mockRejectedValue({ code: 'P2002' }); // Simulate Prisma Unique Constraint Error

    const res = await request(app)
      .post('/api/v1/payment/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Webhook already processed');
    expect(enqueueWebhook).not.toHaveBeenCalled();
  });
});
