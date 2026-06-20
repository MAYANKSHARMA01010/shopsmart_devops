import { Request, Response } from 'express';
import { userService } from './user.service';
import { Role } from '@prisma/client';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    if (role !== 'SUPER_ADMIN') {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const users = await userService.getAllUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role;
    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const userId = req.params.id as string;
    const { role } = req.body;

    if (!Object.values(Role).includes(role as Role)) {
      res.status(400).json({ status: 'error', message: 'Invalid role' });
      return;
    }

    const updatedUser = await userService.updateUserRole(userId, role as Role);
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
