import request from 'supertest';
import { expect } from 'chai';
import app from '../src/server';
import prisma from '../src/config/database';
import redis from '../src/utils/redis';

describe('ShopSmart Backend API', () => {
  
  after(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('GET /api/health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('status', 'ok');
    });
  });

  describe('GET /api/products', () => {
    it('should return 200 and an array of products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should return 404 for a non-existent product ID', async () => {
      const res = await request(app).get('/api/products/999999');
      expect(res.statusCode).to.equal(404);
      expect(res.body).to.have.property('message', 'Product not found');
    });
  });

  describe('POST /api/products (Validation)', () => {
    it('should return 400 for invalid product data', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: '', price: -10 });
      
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.have.property('status', 'fail');
      expect(res.body).to.have.property('errors');
    });
  });
});
