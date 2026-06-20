import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import app from '../src/server';
import redis from '../src/shared/utils/redis';
import prisma from '../src/shared/config/database';

describe('ShopSmart — Integration Tests (API + Database)', () => {

  describe('GET /api/v1/health', () => {
    it('should return 200 with status ok', async () => {
      vi.spyOn(redis, 'ping').mockResolvedValue('PONG');
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should include timestamp and database/redis status fields', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('redis');
    });
  });

});
