import { Request, Response } from 'express';
import { CheckoutService } from './checkout.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../shared/utils/AppError';

const checkoutService = new CheckoutService();

export const initializeCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { addressId, gatewayProvider, couponCode, notes } = req.body;

  const result = await checkoutService.initializeCheckout({
    userId,
    addressId,
    gatewayProvider,
    couponCode,
    notes
  });

  res.status(200).json({
    success: true,
    data: result
  });
});
