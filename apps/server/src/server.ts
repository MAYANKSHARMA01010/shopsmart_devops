import { env } from './shared/config/env';

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from './shared/utils/logger';
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import productRoutes from './modules/product/product.routes';
import categoryRoutes from './modules/categories/category.routes';
import cartRoutes from './modules/cart/cart.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';
import paymentRoutes from './modules/payment/payment.routes';
import { errorHandler, routeNotFoundHandler } from './shared/middleware/errorMiddleware';
import corsOptions from './shared/config/cors';
import redis from './shared/utils/redis';
import prisma from './shared/config/database';

import helmet from 'helmet';
import { globalRateLimiter } from './shared/middleware/rateLimit.middleware';
import authRoutes from './modules/auth/auth.routes';
import './workers/paymentWebhook.worker';

const app = express();
const PORT = env.PORT || 5001;

// Security & rate limiting middlewares
app.use(helmet());
app.use('/api', globalRateLimiter);

// Standard middlewares
app.use(cors(corsOptions));
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));
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
  } catch {
    redisStatus = 'error';
  }

  try {
    // Use the shared prisma instance to test the connection
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
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

// Swagger Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, "../../docs/api/openapi.yaml"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch {
  console.warn("Swagger spec could not be loaded. Please ensure docs/api/openapi.yaml exists.");
}

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Error Handling
app.use(routeNotFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  });
}

export default app;
