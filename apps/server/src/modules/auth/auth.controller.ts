import { Request, Response } from 'express';
import authService from '../auth/auth.service';
import { catchAsync } from '../../shared/utils/catchAsync';

export const register = catchAsync(async (req: Request, res: Response) => {
  const deviceInfo = req.headers['user-agent'] || undefined;
  const result = await authService.register(req.body, deviceInfo);
  
  res.status(201).json({
    status: 'success',
    data: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const deviceInfo = req.headers['user-agent'] || undefined;
  const result = await authService.login(req.body, deviceInfo);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const deviceInfo = req.headers['user-agent'] || undefined;
  const { refreshToken } = req.body;
  const result = await authService.refreshTokens(refreshToken, deviceInfo);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = await authService.getUserById(userId);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = await authService.updateProfile(userId, req.body);

  res.status(200).json({
    status: 'success',
    data: { user },
    message: 'Profile updated successfully',
  });
});
