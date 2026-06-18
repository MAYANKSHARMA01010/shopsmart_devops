import type { Request, Response } from 'express';
import productService from '../product/product.service';
import { catchAsync } from '../../shared/utils/catchAsync';

// ─── GET /api/products ──────────────────────────────────────────────────────
export const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await productService.getAllProducts({
    category: req.query.category as string | undefined,
    search: req.query.search as string | undefined,
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  });

  res.json({
    data: products,
    total: products.length,
  });
});

// ─── GET /api/products/:id ──────────────────────────────────────────────────
export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(String(req.params['id']));
  res.json({ data: product });
});

// ─── POST /api/products ─────────────────────────────────────────────────────
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ data: product, message: 'Product created successfully' });
});

// ─── PUT /api/products/:id ──────────────────────────────────────────────────
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(String(req.params['id']), req.body);
  res.json({ data: product, message: 'Product updated successfully' });
});

// ─── DELETE /api/products/:id ───────────────────────────────────────────────
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.deleteProduct(String(req.params['id']));
  res.json(result);
});
