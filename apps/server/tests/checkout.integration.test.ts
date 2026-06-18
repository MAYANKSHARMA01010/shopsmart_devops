import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';
import redis from '../src/shared/utils/redis';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

import { vi } from 'vitest';
vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      orders: {
        create: vi.fn().mockResolvedValue({ id: 'order_mocked_123', status: 'created' }),
        fetch: vi.fn(),
      },
      payments: {
        refund: vi.fn(),
      }
    }))
  };
});
describe('ShopSmart — Checkout Integration Tests', () => {
  const suffix = Math.random().toString(36).substring(2, 8);
  let customerId = '';
  let customerToken = '';
  let addressId = '';
  let product1Id = '';
  let cartId = '';

  beforeAll(async () => {
    // 1. Create a customer
    const user = await prisma.user.create({
      data: {
        name: `Checkout Customer ${suffix}`,
        email: `checkout-${suffix}@example.com`,
        password: 'Password123!',
        role: Role.CUSTOMER,
      },
    });
    customerId = user.id;
    customerToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Create Address
    const address = await prisma.address.create({
      data: {
        userId: customerId,
        name: 'Home',
        email: 'home@example.com',
        phone: '1234567890',
        line1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      }
    });
    addressId = address.id;

    // 3. Create Category
    const category = await prisma.category.create({
      data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` }
    });

    // 4. Create Product
    const p1 = await prisma.product.create({
      data: {
        name: `Item ${suffix}`,
        slug: `item-${suffix}`,
        basePrice: '100.00',
        stock: 5,
        categoryId: category.id,
      }
    });
    product1Id = p1.id;

    // 5. Add to cart
    const cart = await prisma.cart.create({
      data: {
        userId: customerId,
        items: {
          create: [{ productId: product1Id, quantity: 2 }]
        }
      }
    });
    cartId = cart.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.orderAuditLog.deleteMany({ where: { actorId: customerId } });
    await prisma.payment.deleteMany({ where: { order: { userId: customerId } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: customerId } } });
    await prisma.order.deleteMany({ where: { userId: customerId } });
    await prisma.address.deleteMany({ where: { id: addressId } });
    await prisma.product.delete({ where: { id: product1Id } });
    await prisma.category.deleteMany({ where: { name: `Cat ${suffix}` } });
    await prisma.user.delete({ where: { id: customerId } });
    
    // Clear redis cache
    const keys = await redis.keys('shopsmart:idempotency:v1:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  it('fails if Idempotency-Key header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/checkout/initialize')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId,
        gatewayProvider: 'RAZORPAY'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Idempotency-Key header is required');
  });

  it('successfully creates an order and tests idempotency', async () => {
    const idempotencyKey = `test-key-${suffix}`;

    const res1 = await request(app)
      .post('/api/v1/checkout/initialize')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        addressId,
        gatewayProvider: 'RAZORPAY'
      });

    console.log('Checkout Response:', res1.body);
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.order.id).toBeDefined();

    // Verify stock deduction
    const p = await prisma.product.findUnique({ where: { id: product1Id } });
    expect(p?.stock).toBe(3); // 5 - 2 = 3

    // Verify cart is cleared
    const c = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: true } });
    expect(c?.items.length).toBe(0);

    // Test idempotency hit
    const res2 = await request(app)
      .post('/api/v1/checkout/initialize')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        addressId,
        gatewayProvider: 'RAZORPAY'
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.order.id).toBe(res1.body.data.order.id);
  });
});
