import type { Request, Response } from 'express';
import categoryService from './category.service';
import { catchAsync } from '../../shared/utils/catchAsync';

export const getCategoryTree = catchAsync(async (_req: Request, res: Response) => {
  const categories = await categoryService.getCategoryTree();
  res.json({ success: true, data: categories });
});

export const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(String(req.params['id']));
  res.json({ success: true, data: category });
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(String(req.params['id']), req.body);
  res.json({ success: true, data: category });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.deleteCategory(String(req.params['id']));
  res.json({ success: true, data: result });
});

