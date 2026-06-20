import { Request, Response } from 'express';
import { orderService } from './order.service';

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const orders = await orderService.getMyOrders(userId);
    res.status(200).json({ status: 'success', data: orders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const userId = req.user!.id;
    const role = req.user!.role;

    const order = await orderService.getOrderById(orderId, userId, role);
    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VENDOR') {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const orders = await orderService.getAllOrders();
    res.status(200).json({ status: 'success', data: { orders } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VENDOR') {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const orderId = req.params.id as string;
    const { status, trackingNumber } = req.body;

    const order = await orderService.updateOrderStatus(orderId, status, trackingNumber);
    res.status(200).json({ status: 'success', data: { order } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
