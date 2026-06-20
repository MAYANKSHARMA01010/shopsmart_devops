import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

describe('ShopSmart — Orders API Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let customer2Token: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Create users
    const admin = await prisma.user.create({
      data: { name: 'Admin', email: `admin-${Date.now()}@example.com`, password: 'hash', role: Role.ADMIN }
    });
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, ACCESS_SECRET, { expiresIn: '1h' });

    const cust1 = await prisma.user.create({
      data: { name: 'Cust1', email: `cust1-${Date.now()}@example.com`, password: 'hash', role: Role.CUSTOMER }
    });
    customerToken = jwt.sign({ id: cust1.id, email: cust1.email, role: cust1.role }, ACCESS_SECRET, { expiresIn: '1h' });

    const cust2 = await prisma.user.create({
      data: { name: 'Cust2', email: `cust2-${Date.now()}@example.com`, password: 'hash', role: Role.CUSTOMER }
    });
    customer2Token = jwt.sign({ id: cust2.id, email: cust2.email, role: cust2.role }, ACCESS_SECRET, { expiresIn: '1h' });

    // Create an address for Cust1
    const address = await prisma.address.create({
      data: {
        userId: cust1.id,
        name: 'Home',
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country'
      }
    });

    // Create an order for Cust1
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: cust1.id } },
        address: { connect: { id: address.id } },
        status: 'PENDING',
        totalAmount: 50.00,
        subtotal: 50.00,
        currency: 'usd',
        paymentMethod: 'razorpay'
      }
    });
    testOrderId = order.id;
  });

  describe('GET /api/v1/orders/my-orders', () => {
    it('should return 200 and an array of orders for the customer', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should allow customer to fetch their own order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(testOrderId);
    });

    it('should forbid customer from fetching another customer order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customer2Token}`);
      expect(res.status).toBe(404); // Or 403, our implementation returns 404 Not Found if it belongs to someone else
    });

    it('should allow admin to fetch any order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/orders (Admin)', () => {
    it('should return 403 for CUSTOMER', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return all orders for ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });
  });

  describe('PATCH /api/v1/orders/:id/status', () => {
    it('should return 403 for CUSTOMER', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'SHIPPED' });
      expect(res.status).toBe(403);
    });

    it('should update order status for ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SHIPPED', trackingNumber: 'TRACK123' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('SHIPPED');
      expect(res.body.data.order.trackingNumber).toBe('TRACK123');
    });
  });
});
