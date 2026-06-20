import { Router } from 'express';
import { getMyOrders, getOrderById, getAllOrders, updateOrderStatus } from './order.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAllOrders);
router.get('/my-orders', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, updateOrderStatus);

export default router;
