import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';
import prisma from '../src/shared/config/database';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

const superAdminToken = jwt.sign(
  { id: 'super-admin-1', email: 'super@example.com', role: Role.SUPER_ADMIN },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const customerToken = jwt.sign(
  { id: 'customer-1', email: 'cust@example.com', role: Role.CUSTOMER },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

describe('ShopSmart — Users API Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `testuser-${Date.now()}@example.com`,
        password: 'dummy',
        role: Role.CUSTOMER
      }
    });
    testUserId = user.id;
  });

  describe('GET /api/v1/users', () => {
    it('should return 403 for CUSTOMER', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 200 and a list of users for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });
  });

  describe('PATCH /api/v1/users/:id/role', () => {
    it('should update user role if SUPER_ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'VENDOR' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('VENDOR');
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'INVALID_ROLE' });
      
      expect(res.status).toBe(400);
    });
  });
});
