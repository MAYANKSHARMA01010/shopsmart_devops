import { z } from "zod";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  children: CategoryNode[];
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
}

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export const categoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
    parentId: z.string().uuid().optional().nullable(),
    children: z.array(categoryNodeSchema),
  })
);

export const categoryTreeSchema = z.array(categoryNodeSchema);
