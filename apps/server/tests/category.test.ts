import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';
import redis from '../src/shared/utils/redis';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
const adminToken = jwt.sign(
  { id: 'admin-id-123', email: 'admin@example.com', role: Role.ADMIN },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);
const customerToken = jwt.sign(
  { id: 'customer-id-123', email: 'customer@example.com', role: Role.CUSTOMER },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const CACHE_KEY = 'categories:tree';

describe('ShopSmart — Category API Tests', () => {
  const suffix = Math.random().toString(36).substring(2, 8);
  let parentCategoryId = '';
  let childCategoryId = '';
  let categoryForDeleteId = '';
  let categoryWithProductId = '';
  let productId = '';

  beforeAll(async () => {
    const parent = await prisma.category.create({
      data: {
        name: `Parent Category ${suffix}`,
        slug: `parent-${suffix}`,
      },
    });
    parentCategoryId = parent.id;

    const child = await prisma.category.create({
      data: {
        name: `Child Category ${suffix}`,
        slug: `child-${suffix}`,
        parentId: parent.id,
      },
    });
    childCategoryId = child.id;

    const categoryForDelete = await prisma.category.create({
      data: {
        name: `Delete Category ${suffix}`,
        slug: `delete-${suffix}`,
      },
    });
    categoryForDeleteId = categoryForDelete.id;

    const categoryWithProduct = await prisma.category.create({
      data: {
        name: `Product Category ${suffix}`,
        slug: `product-${suffix}`,
      },
    });
    categoryWithProductId = categoryWithProduct.id;

    const product = await prisma.product.create({
      data: {
        name: `Product ${suffix}`,
        slug: `product-${suffix}`,
        basePrice: '99.00',
        stock: 5,
        images: [],
        categoryId: categoryWithProduct.id,
        isVisible: true,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    // Delete products first to avoid FK constraint violations.
    // Also delete by categoryId in case beforeAll timed out after creating
    // the category but before productId was captured.
    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    } else if (categoryWithProductId) {
      await prisma.product.deleteMany({ where: { categoryId: categoryWithProductId } });
    }

    if (childCategoryId) {
      await prisma.category.delete({ where: { id: childCategoryId } });
    }

    const ids = [parentCategoryId, categoryForDeleteId, categoryWithProductId].filter(Boolean);
    if (ids.length) {
      await prisma.category.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('GET /api/v1/categories returns a category tree', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/categories/:id returns a single category', async () => {
    const res = await request(app).get(`/api/v1/categories/${parentCategoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', parentCategoryId);
  });

  it('POST /api/v1/categories creates a category (admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `New Category ${suffix}` });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('name');

    await prisma.category.delete({ where: { id: res.body.data.id } });
  });

  it('POST /api/v1/categories rejects non-admin users', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: `Denied Category ${suffix}` });

    expect(res.status).toBe(403);
  });

  it('PUT /api/v1/categories/:id updates a category (admin only)', async () => {
    const res = await request(app)
      .put(`/api/v1/categories/${parentCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('description', 'Updated description');
  });

  it('DELETE /api/v1/categories/:id blocks deletion when products exist', async () => {
    const res = await request(app)
      .delete(`/api/v1/categories/${categoryWithProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  it('DELETE /api/v1/categories/:id deletes a category with no products', async () => {
    const res = await request(app)
      .delete(`/api/v1/categories/${categoryForDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('message', 'Category deleted successfully');

    categoryForDeleteId = '';
  });

  (redis.status === 'ready' ? it : it.skip)('invalidates cache on update', async () => {
    await redis.setex(CACHE_KEY, 120, JSON.stringify([{ id: 'cached' }]));

    const res = await request(app)
      .put(`/api/v1/categories/${parentCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Cache invalidation check' });

    expect(res.status).toBe(200);

    const cached = await redis.get(CACHE_KEY);
    expect(cached).toBeNull();
  });
});
