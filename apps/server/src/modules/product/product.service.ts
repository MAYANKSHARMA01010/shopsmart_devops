import prisma from '../../shared/config/database';
import { AppError } from '../../shared/utils/AppError';
import redis from '../../shared/utils/redis';
import logger from '../../shared/utils/logger';
import type { Prisma } from '@prisma/client';

// ─── Product with category relation ────────────────────────────────────────

export const productWithCategory = {
  include: { category: true },
} satisfies Prisma.ProductDefaultArgs;

export type ProductWithCategory = Prisma.ProductGetPayload<typeof productWithCategory>;

// ─── Service ────────────────────────────────────────────────────────────────

class ProductService {
  private readonly CACHE_KEY = 'products:all';
  private readonly CACHE_TTL = 3600; // 1 hour

  async getAllProducts(filters: {
    category?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }): Promise<{
    data: ProductWithCategory[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const { category, search, minPrice, maxPrice, sort, page = '1', limit = '12' } = filters;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 12);

    const where: Prisma.ProductWhereInput = { isVisible: true };

    // Filter by category slug
    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    // Full-text search on name and description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        where.basePrice.gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        where.basePrice.lte = Number(maxPrice);
      }
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort) {
      switch (sort) {
        case 'price_asc':
          orderBy = { basePrice: 'asc' };
          break;
        case 'price_desc':
          orderBy = { basePrice: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'newest':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    // Execute query with pagination
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    };
  }

  async getProductById(id: string): Promise<ProductWithCategory> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductWithCategory> {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  async createProduct(data: {
    name: string;
    description?: string | null;
    basePrice: number | string;
    comparePrice?: number | string | null;
    stock?: number;
    sku?: string | null;
    images?: string[];
    isVisible?: boolean;
    categoryId: string;
    slug?: string;
  }): Promise<ProductWithCategory> {
    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError('Category not found', 400);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug ?? this.generateSlug(data.name),
        description: data.description ?? null,
        basePrice: data.basePrice,
        comparePrice: data.comparePrice ?? null,
        stock: data.stock ?? 0,
        sku: data.sku ?? null,
        images: data.images ?? [],
        isVisible: data.isVisible ?? true,
        categoryId: data.categoryId,
      },
      include: { category: true },
    });

    try { await redis.del(this.CACHE_KEY); } catch { /* silent */ }

    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      basePrice: number | string;
      comparePrice: number | string | null;
      stock: number;
      sku: string | null;
      images: string[];
      isVisible: boolean;
      categoryId: string;
    }>
  ): Promise<ProductWithCategory> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new AppError('Category not found', 400);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.comparePrice !== undefined && { comparePrice: data.comparePrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: { category: true },
    });

    try { await redis.del(this.CACHE_KEY); } catch { /* silent */ }

    return product;
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    // Soft-delete preferred: set isVisible = false
    // Hard delete will fail if the product has been ordered (RESTRICT FK on OrderItem)
    await prisma.product.delete({ where: { id } });

    try { await redis.del(this.CACHE_KEY); } catch { /* silent */ }

    return { message: 'Product deleted successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    // 6-char suffix to prevent collisions
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }
}

export default new ProductService();
