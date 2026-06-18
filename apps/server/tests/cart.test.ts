import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';
import redis from '../src/shared/utils/redis';
import {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartSchema,
  productIdParamSchema,
} from '../src/modules/cart/cart.validator';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

// ═══════════════════════════════════════════════════════════════
// UNIT TESTS — Zod Validation Schemas
// ═══════════════════════════════════════════════════════════════

describe('Cart Zod Validation — Unit Tests', () => {
  describe('addToCartSchema', () => {
    it('should accept valid input', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 3,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID productId', () => {
      const result = addToCartSchema.safeParse({
        productId: 'not-a-uuid',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero quantity', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject float quantity', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject quantity above 10', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 11,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing productId', () => {
      const result = addToCartSchema.safeParse({ quantity: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject missing quantity', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCartItemSchema', () => {
    it('should accept valid quantity', () => {
      const result = updateCartItemSchema.safeParse({ quantity: 5 });
      expect(result.success).toBe(true);
    });

    it('should reject zero quantity', () => {
      const result = updateCartItemSchema.safeParse({ quantity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject quantity above 10', () => {
      const result = updateCartItemSchema.safeParse({ quantity: 11 });
      expect(result.success).toBe(false);
    });

    it('should reject float quantity', () => {
      const result = updateCartItemSchema.safeParse({ quantity: 3.7 });
      expect(result.success).toBe(false);
    });
  });

  describe('mergeCartSchema', () => {
    it('should accept valid items array', () => {
      const result = mergeCartSchema.safeParse({
        items: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const result = mergeCartSchema.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it('should reject items with invalid UUID', () => {
      const result = mergeCartSchema.safeParse({
        items: [{ productId: 'bad-id', quantity: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject items with quantity above 10', () => {
      const result = mergeCartSchema.safeParse({
        items: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 15 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('productIdParamSchema', () => {
    it('should accept valid UUID', () => {
      const result = productIdParamSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID string', () => {
      const result = productIdParamSchema.safeParse({
        productId: 'not-valid',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS — Cart API
// ═══════════════════════════════════════════════════════════════

describe('ShopSmart — Cart API Tests', () => {
  const suffix = Math.random().toString(36).substring(2, 8);
  let customerId = '';
  let customerToken = '';
  let categoryId = '';
  let product1Id = '';
  let product2Id = '';
  let productLowStockId = '';
  let productInvisibleId = '';

  beforeAll(async () => {
    // 1. Create a customer user
    const user = await prisma.user.create({
      data: {
        name: `Cart Customer ${suffix}`,
        email: `customer-${suffix}@example.com`,
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

    // 2. Create Category
    const category = await prisma.category.create({
      data: {
        name: `Cart Category ${suffix}`,
        slug: `cart-cat-${suffix}`,
      },
    });
    categoryId = category.id;

    // 3. Create Products
    const p1 = await prisma.product.create({
      data: {
        name: `Keyboard ${suffix}`,
        slug: `keyboard-${suffix}`,
        basePrice: '99.99',
        comparePrice: '120.00',
        stock: 15,
        images: ['https://assets.shopsmart.com/kbd.jpg'],
        isVisible: true,
        categoryId: category.id,
      },
    });
    product1Id = p1.id;

    const p2 = await prisma.product.create({
      data: {
        name: `Mouse ${suffix}`,
        slug: `mouse-${suffix}`,
        basePrice: '49.99',
        stock: 20,
        images: [],
        isVisible: true,
        categoryId: category.id,
      },
    });
    product2Id = p2.id;

    const pLowStock = await prisma.product.create({
      data: {
        name: `Limited Edition Keycap ${suffix}`,
        slug: `keycap-${suffix}`,
        basePrice: '25.00',
        stock: 3,
        isVisible: true,
        categoryId: category.id,
      },
    });
    productLowStockId = pLowStock.id;

    const pInvisible = await prisma.product.create({
      data: {
        name: `Secret Item ${suffix}`,
        slug: `secret-${suffix}`,
        basePrice: '999.00',
        stock: 10,
        isVisible: false,
        categoryId: category.id,
      },
    });
    productInvisibleId = pInvisible.id;
  });

  afterAll(async () => {
    // Clean up DB records in reverse order
    await prisma.cartItem.deleteMany({
      where: {
        cart: { userId: customerId },
      },
    });

    await prisma.cart.deleteMany({
      where: { userId: customerId },
    });

    const productIds = [product1Id, product2Id, productLowStockId, productInvisibleId].filter(Boolean);
    if (productIds.length) {
      await prisma.product.deleteMany({
        where: { id: { in: productIds } },
      });
    }

    if (categoryId) {
      await prisma.category.delete({
        where: { id: categoryId },
      });
    }

    if (customerId) {
      await prisma.user.delete({
        where: { id: customerId },
      });
    }

    // Invalidate Redis cache
    try {
      await redis.del(`cart:${customerId}`);
    } catch {
      // silent
    }
  });

  describe('GET /api/v1/cart', () => {
    it('should return 401 when access token is missing', async () => {
      const res = await request(app).get('/api/v1/cart');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return an empty cart initially', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.totalItems).toBe(0);
      expect(res.body.data.subtotal).toBe('0.00');
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('should reject with 400 if quantity is negative or 0', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: product1Id, quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject with 400 if quantity exceeds 10', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: product1Id, quantity: 11 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject with 404 if product does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 });

      expect(res.status).toBe(404);
    });

    it('should reject if product is invisible', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: productInvisibleId, quantity: 1 });

      expect(res.status).toBe(400);
    });

    it('should successfully add a valid product to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: product1Id, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toHaveProperty('productId', product1Id);
      expect(res.body.data.items[0]).toHaveProperty('quantity', 2);
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.subtotal).toBe('199.98');
    });

    it('should increment quantity if same product is added again', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: product1Id, quantity: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.items[0].quantity).toBe(3);
      expect(res.body.data.totalItems).toBe(3);
      expect(res.body.data.subtotal).toBe('299.97');
    });

    it('should reject with 400 if added quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: productLowStockId, quantity: 5 });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/cart/items/:productId', () => {
    it('should successfully update quantity', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${product1Id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(5);
      expect(res.body.data.totalItems).toBe(5);
      expect(res.body.data.subtotal).toBe('499.95');
    });

    it('should reject if updating quantity beyond stock', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${product1Id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 16 }); // stock is 15

      expect(res.status).toBe(400);
    });

    it('should return 404 when updating a product not in the cart', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${product2Id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/cart/items/:productId', () => {
    it('should delete specified item from cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${product1Id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.totalItems).toBe(0);
      expect(res.body.data.subtotal).toBe('0.00');
    });

    it('should return 404 when removing a product not in the cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${product2Id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/cart/merge', () => {
    it('should merge guest cart items into authenticated cart', async () => {
      // 1. Add some items directly to database first
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: product1Id, quantity: 1 });

      // 2. Perform merge with guest items
      const res = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            { productId: product1Id, quantity: 2 }, // exists in DB, quantity should become 3
            { productId: product2Id, quantity: 4 }, // new item, should be added
            { productId: productLowStockId, quantity: 5 }, // quantity (5) exceeds stock (3), should be capped at 3
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const items = res.body.data.items;
      expect(items).toHaveLength(3);

      const item1 = items.find((i: { productId: string }) => i.productId === product1Id);
      expect(item1.quantity).toBe(3);

      const item2 = items.find((i: { productId: string }) => i.productId === product2Id);
      expect(item2.quantity).toBe(4);

      const itemLowStock = items.find((i: { productId: string }) => i.productId === productLowStockId);
      expect(itemLowStock.quantity).toBe(3); // capped at stock (3)
    });

    it('should reject merge with empty items array', async () => {
      const res = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('should clear the entire cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cart is now empty
      const getRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(getRes.body.data.items).toHaveLength(0);
      expect(getRes.body.data.totalItems).toBe(0);
      expect(getRes.body.data.subtotal).toBe('0.00');
    });
  });
});
