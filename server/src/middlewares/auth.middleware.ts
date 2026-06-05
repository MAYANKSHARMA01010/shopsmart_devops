import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { JwtPayload } from '../types/auth';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: Access token missing or invalid', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'default-access-secret') as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return next(new AppError('Unauthorized: Access token expired', 401));
    }
    return next(new AppError('Unauthorized: Invalid access token', 401));
  }
};
