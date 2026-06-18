import { z } from "zod";

export const cartProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  basePrice: z.string(),
  comparePrice: z.string().nullable(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string()),
  isVisible: z.boolean(),
});

export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  product: cartProductSchema,
  warnings: z.array(z.string()),
});

export const cartSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(cartItemSchema),
  totalItems: z.number().int().nonnegative(),
  subtotal: z.string(),
});

export type CartProduct = z.infer<typeof cartProductSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
