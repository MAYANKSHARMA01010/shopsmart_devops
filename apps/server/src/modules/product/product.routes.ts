import express from 'express';
import * as productController from './product.controller';
import { validateProduct, productSchema, updateProductSchema } from './product.validator';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/rbac.middleware';

const router = express.Router();

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

router.post(
  '/',
  authenticate,
  requirePermission('products:create'),
  validateProduct(productSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  requirePermission('products:update'),
  validateProduct(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('products:delete'),
  productController.deleteProduct
);

export default router;
