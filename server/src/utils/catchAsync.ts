import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler and forwards any thrown errors
 * to the centralized error handler via next(err).
 *
 * Eliminates repetitive try/catch boilerplate in every controller.
 * Used starting in M4 when the product controller is updated.
 *
 * @example
 * export const getProduct = catchAsync(async (req, res) => {
 *   const product = await productService.findById(req.params.id);
 *   res.json(product);
 * });
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
