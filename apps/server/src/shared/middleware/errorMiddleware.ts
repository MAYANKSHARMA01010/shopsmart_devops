import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';

type ErrorPayload = {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const payload = err as ErrorPayload;
  const statusCode = payload.statusCode ?? 500;
  const isOperational = payload.isOperational ?? false;

  if (!isOperational && statusCode >= 500) {
    logger.error('ERROR 💥:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational && payload.message ? payload.message : 'Something went very wrong!',
    ...(payload.errors ? { errors: payload.errors } : {}),
    ...(process.env.NODE_ENV === 'test' ? { debugError: (err as any)?.message, stack: (err as any)?.stack } : {}),
  });
};

export const routeNotFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};
