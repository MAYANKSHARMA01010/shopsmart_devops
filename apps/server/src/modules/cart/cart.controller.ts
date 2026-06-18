import { Request, Response } from 'express';
import cartService from './cart.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../shared/utils/AppError';

export const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const cart = await cartService.getCart(userId);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const addItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { productId, quantity } = req.body;
  const cart = await cartService.addItem(userId, productId, quantity);
  res.status(201).json({
    success: true,
    data: cart,
  });
});

export const updateQuantity = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const productId = req.params.productId as string;
  const { quantity } = req.body;
  const cart = await cartService.updateQuantity(userId, productId, quantity);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const removeItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const productId = req.params.productId as string;
  const cart = await cartService.removeItem(userId, productId);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  await cartService.clearCart(userId);
  res.status(200).json({
    success: true,
    data: {
      message: 'Cart cleared successfully',
    },
  });
});

export const mergeCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { items } = req.body;
  const cart = await cartService.mergeCart(userId, items);
  res.status(200).json({
    success: true,
    data: cart,
  });
});
