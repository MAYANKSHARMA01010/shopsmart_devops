import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import redis from '../../utils/redis';
import logger from '../../utils/logger';
import { Prisma } from '@prisma/client';
import { CartWithItems, CartResponseDto } from './cart.types';

class CartService {
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Helper to invalidate Redis cache for a user's cart.
   */
  private async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `cart:${userId}`;
    try {
      await redis.del(cacheKey);
    } catch (err: unknown) {
      logger.warn('Redis Cache Error (Delete): Continuing without cache', { error: err });
    }
  }

  /**
   * Safe helper to retrieve a user's cart, creating it on-demand if missing.
   */
  async getOrCreateCart(userId: string, tx?: Prisma.TransactionClient): Promise<CartWithItems> {
    const client = tx || prisma;
    const cart = await client.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return cart as CartWithItems;
  }

  /**
   * Retrieves cart. Implements Cache-Aside (Read-Through Redis).
   */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cacheKey = `cart:${userId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`Serving cart for user ${userId} from Redis cache`);
        return JSON.parse(cached);
      }
    } catch (err: unknown) {
      logger.warn('Redis Cache Error (Get): Continuing with Database', { error: err });
    }

    const cart = await this.getOrCreateCart(userId);
    const formatted = this.formatCart(cart);

    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(formatted));
    } catch (err: unknown) {
      logger.warn('Redis Cache Error (Set): Continuing without cache', { error: err });
    }

    return formatted;
  }

  /**
   * Adds an item to the cart. Validates product existence, visibility, and stock.
   */
  async addItem(userId: string, productId: string, quantity: number): Promise<CartResponseDto> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (!product.isVisible) {
      throw new AppError('Product is currently unavailable', 400);
    }

    if (product.stock <= 0) {
      throw new AppError('Product is out of stock', 400);
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = cart.items.find((item) => item.productId === productId);
    const targetQuantity = (existingItem?.quantity || 0) + quantity;

    if (!existingItem && cart.items.length >= 50) {
      throw new AppError('Cannot add item. Cart has reached maximum limit of 50 unique items.', 400);
    }

    if (targetQuantity > 10) {
      throw new AppError('Maximum quantity per item in a cart is 10.', 400);
    }

    if (targetQuantity > product.stock) {
      throw new AppError(`Cannot add requested quantity. Only ${product.stock} items in stock.`, 400);
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: targetQuantity,
      },
      create: {
        cartId: cart.id,
        productId,
        quantity: targetQuantity,
      },
    });

    await this.invalidateCache(userId);

    return this.getCart(userId);
  }

  /**
   * Updates an item's quantity.
   */
  async updateQuantity(userId: string, productId: string, quantity: number): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (!existingItem) {
      throw new AppError('Item not found in cart', 404);
    }

    if (quantity > 10) {
      throw new AppError('Maximum quantity per item in a cart is 10.', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isVisible) {
      throw new AppError('Product is currently unavailable', 400);
    }

    if (quantity > product.stock) {
      throw new AppError(`Cannot update quantity. Only ${product.stock} items in stock.`, 400);
    }

    await prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity,
      },
    });

    await this.invalidateCache(userId);

    return this.getCart(userId);
  }

  /**
   * Removes an item from the cart.
   */
  async removeItem(userId: string, productId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (!existingItem) {
      throw new AppError('Item not found in cart', 404);
    }

    await prisma.cartItem.delete({
      where: {
        id: existingItem.id,
      },
    });

    await this.invalidateCache(userId);

    return this.getCart(userId);
  }

  /**
   * Clears all items in the cart.
   */
  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
    await this.invalidateCache(userId);
  }

  /**
   * Merges guest items into user's authenticated cart.
   */
  async mergeCart(userId: string, guestItems: Array<{ productId: string; quantity: number }>): Promise<CartResponseDto> {
    // Defense-in-depth: do not wipe existing cart if guest payload is empty
    if (guestItems.length === 0) {
      return this.getCart(userId);
    }

    await prisma.$transaction(async (tx) => {
      const cart = await this.getOrCreateCart(userId, tx);

      const productIds = guestItems.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      const mergedItemsMap = new Map<string, { productId: string; quantity: number }>();
      for (const item of cart.items) {
        mergedItemsMap.set(item.productId, { productId: item.productId, quantity: item.quantity });
      }

      for (const guestItem of guestItems) {
        const product = productMap.get(guestItem.productId);
        if (!product || !product.isVisible || product.stock <= 0) {
          continue;
        }

        const existing = mergedItemsMap.get(guestItem.productId);
        if (existing) {
          const newQuantity = Math.min(existing.quantity + guestItem.quantity, product.stock, 10);
          if (newQuantity > 0) {
            mergedItemsMap.set(guestItem.productId, { productId: guestItem.productId, quantity: newQuantity });
          } else {
            mergedItemsMap.delete(guestItem.productId);
          }
        } else {
          const newQuantity = Math.min(guestItem.quantity, product.stock, 10);
          if (newQuantity > 0) {
            mergedItemsMap.set(guestItem.productId, { productId: guestItem.productId, quantity: newQuantity });
          }
        }
      }

      let mergedItems = Array.from(mergedItemsMap.values());
      if (mergedItems.length > 50) {
        mergedItems = mergedItems.slice(0, 50);
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      if (mergedItems.length > 0) {
        await tx.cartItem.createMany({
          data: mergedItems.map((item) => ({
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
      }
    });

    await this.invalidateCache(userId);

    return this.getCart(userId);
  }

  /**
   * Helper to format a DB cart record into a clean DTO.
   */
  private formatCart(cart: CartWithItems): CartResponseDto {
    let subtotal = new Prisma.Decimal(0);
    let totalItems = 0;

    const items = cart.items.map((item) => {
      const product = item.product;
      const warnings: string[] = [];

      if (!product.isVisible) {
        warnings.push('This product is currently unavailable.');
      } else if (product.stock <= 0) {
        warnings.push('Requested quantity exceeds available stock.');
      } else if (item.quantity > product.stock) {
        warnings.push('Requested quantity exceeds available stock.');
      }

      const basePriceStr = product.basePrice.toFixed(2);
      const comparePriceStr = product.comparePrice ? product.comparePrice.toFixed(2) : null;

      if (product.isVisible) {
        const itemSubtotal = product.basePrice.mul(item.quantity);
        subtotal = subtotal.add(itemSubtotal);
      }

      totalItems += item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          basePrice: basePriceStr,
          comparePrice: comparePriceStr,
          stock: product.stock,
          images: product.images,
          isVisible: product.isVisible,
        },
        warnings,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalItems,
      subtotal: subtotal.toFixed(2),
    };
  }
}

export default new CartService();
