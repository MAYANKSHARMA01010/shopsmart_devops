import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { Permission, RolePermissions } from '../../modules/auth/auth.types';

/**
 * Guard route by requiring specific roles.
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Guard route by requiring specific permissions mapped to the user's role.
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }

    const userPermissions = RolePermissions[req.user.role as Role] || [];
    if (!userPermissions.includes(permission)) {
      return next(new AppError('Forbidden: You do not have permission to perform this action', 403));
    }

    next();
  };
};
