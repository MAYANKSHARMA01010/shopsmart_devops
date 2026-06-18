import { Router } from 'express';
import { verifyPayment, handleRazorpayWebhook } from './payment.controller';
import { validateVerifyBody } from './payment.validator';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.post('/verify', authenticate, validateVerifyBody, verifyPayment);
// Note: express.raw() is applied explicitly for /webhook in server.ts
router.post('/webhook', handleRazorpayWebhook);

export default router;
