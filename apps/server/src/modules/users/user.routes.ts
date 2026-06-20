import { Router } from 'express';
import { getAllUsers, updateUserRole } from './user.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAllUsers);
router.patch('/:id/role', authenticate, updateUserRole);

export default router;
