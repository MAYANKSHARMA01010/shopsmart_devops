import { Router } from 'express';
import * as categoryController from './category.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/rbac.middleware';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
  validateBody,
  validateParams,
} from './category.validator';

const router = Router();

router.get('/', categoryController.getCategoryTree);
router.get('/:id', validateParams(categoryIdParamSchema), categoryController.getCategoryById);

router.post(
  '/',
  authenticate,
  requirePermission('categories:create'),
  validateBody(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  requirePermission('categories:update'),
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('categories:delete'),
  validateParams(categoryIdParamSchema),
  categoryController.deleteCategory
);

export default router;
