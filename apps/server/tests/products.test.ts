import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

const adminToken = jwt.sign(
  { id: 'admin-123', email: 'admin@example.com', role: Role.SUPER_ADMIN },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const vendorToken = jwt.sign(
  { id: 'vendor-123', email: 'vendor@example.com', role: Role.VENDOR },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const customerToken = jwt.sign(
  { id: 'customer-123', email: 'cust@example.com', role: Role.CUSTOMER },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

describe('ShopSmart — Products API Tests', () => {
  let createdProductId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Setup a category first
    const cat = await prisma.category.create({
      data: { name: 'Test Cat ' + Date.now(), slug: 'test-cat-' + Date.now() }
    });
    categoryId = cat.id;
  });

  it('should return 200 and an array of products', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 404 for a non-existent product ID', async () => {
    const res = await request(app).get('/api/v1/products/00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('should return 400 with validation errors for invalid product data', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', basePrice: -10, categoryId: 'invalid-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should create a product successfully as VENDOR', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        name: 'Test Product',
        slug: 'test-product-' + Date.now(),
        description: 'Testing',
        basePrice: 100,
        stockData: [{ sku: 'TEST-SKU', size: 'M', color: 'Red', quantity: 10 }],
        categoryId,
        vendorId: 'vendor-123'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    createdProductId = res.body.data.id;
  });

  it('should forbid product creation for CUSTOMER', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Test Product 2',
        slug: 'test-product-2-' + Date.now(),
        description: 'Testing',
        basePrice: 100,
        stockData: [],
        categoryId,
        vendorId: 'customer-123'
      });

    expect(res.status).toBe(403);
  });

  it('should update product successfully', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ basePrice: 150 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.basePrice)).toBe(150);
  });

  it('should delete product successfully as ADMIN', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
