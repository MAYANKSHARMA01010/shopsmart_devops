import { z } from "zod";

// ─── Form input schema (what the ProductForm submits) ──────────────────────

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  basePrice: z
    .union([z.number(), z.string()])
    .transform((val) => Number.parseFloat(val as string))
    .refine((val) => !isNaN(val) && val >= 0, "Price must be a positive number"),
  comparePrice: z
    .union([z.number(), z.string()])
    .transform((val) => (val === "" || val === undefined || val === null ? undefined : Number.parseFloat(val as string)))
    .optional()
    .nullable(),
  stock: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === undefined ? 0 : Number.parseInt(val as string, 10)))
    .refine((val) => !isNaN(val) && val >= 0, "Stock must be a non-negative integer"),
  sku: z.string().optional().nullable(),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  isVisible: z.boolean().default(true),
  categoryId: z.string().min(1, "Category is required"),
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

// ─── API response shape ────────────────────────────────────────────────────
// Matches what the server returns: Prisma Product + nested category object

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
}

export interface Product extends ProductData {
  /** UUID string — no longer a number */
  id: string;
  slug: string;
  category: ProductCategory;
  createdAt: string;
  updatedAt: string;
}

// ─── Utility: format a price value that may come from the API as a string
// (Prisma Decimal → JSON serialized as string "19.99") ─────────────────────

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  return Number.parseFloat(String(value)).toFixed(2);
}
