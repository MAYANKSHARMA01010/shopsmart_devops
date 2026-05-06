import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';
import productRoutes from './routes/productRoutes';
import { errorHandler, routeNotFoundHandler } from './middlewares/errorMiddleware';
import corsOptions from './config/cors';
import redis from './utils/redis';

const app = express();
const PORT = process.env.SERVER_PORT || 5001;

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/favicon.ico', (req: Request, res: Response) => { res.status(204).end(); });

const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Health Check
app.get('/api/health', healthCheckLimiter, async (req: Request, res: Response) => {
  let redisStatus = 'disconnected';
  let dbStatus = 'disconnected';

  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch (_err) {
    redisStatus = 'error';
  }

  try {
    // Actually test the database connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (_err) {
    dbStatus = 'error';
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'error',
    message: 'ShopSmart Backend Health Check',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    redis: redisStatus,
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'ShopSmart Backend Service v4 (TypeScript + Redis)', version: '4.0.0' });
});

// Routes
app.use('/api/products', productRoutes);

// Error Handling
app.use(routeNotFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}

export default app;
