import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    
    // Only ADMIN or SUPER_ADMIN can view analytics for now
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const data = await analyticsService.getOverview();
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};
