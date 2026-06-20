import { Router } from 'express';
import { getOverview } from './analytics.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.get('/overview', authenticate, getOverview);

export default router;
