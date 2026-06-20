import request from 'supertest';
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../src/server';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';

const adminToken = jwt.sign(
  { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const customerToken = jwt.sign(
  { id: 'customer-1', email: 'cust@example.com', role: Role.CUSTOMER },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

describe('ShopSmart — Analytics API Tests', () => {
  describe('GET /api/v1/analytics/overview', () => {
    it('should return 403 for CUSTOMER', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 200 and analytics data for ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.totalRevenue).toBeDefined();
      expect(res.body.data.ordersToday).toBeDefined();
      expect(res.body.data.activeProducts).toBeDefined();
      expect(Array.isArray(res.body.data.salesData)).toBe(true);
    });
  });
});
