import express from 'express';
import * as cartController from './cart.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartSchema,
  productIdParamSchema,
  validateBody,
  validateParams,
} from './cart.validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', requirePermission('cart:read'), cartController.getCart);
router.post('/items', requirePermission('cart:write'), validateBody(addToCartSchema), cartController.addItem);
router.put(
  '/items/:productId',
  requirePermission('cart:write'),
  validateParams(productIdParamSchema),
  validateBody(updateCartItemSchema),
  cartController.updateQuantity
);
router.delete(
  '/items/:productId',
  requirePermission('cart:write'),
  validateParams(productIdParamSchema),
  cartController.removeItem
);
router.delete('/', requirePermission('cart:write'), cartController.clearCart);
router.post('/merge', requirePermission('cart:write'), validateBody(mergeCartSchema), cartController.mergeCart);

export default router;
