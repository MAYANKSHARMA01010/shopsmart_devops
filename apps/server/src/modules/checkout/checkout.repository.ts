import prisma from '../../shared/config/database';
import { Prisma } from '@prisma/client';

export class CheckoutRepository {
  async findCartByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  async findAddressById(addressId: string) {
    return prisma.address.findUnique({
      where: { id: addressId },
    });
  }

  async findCouponByCode(code: string) {
    return prisma.coupon.findUnique({
      where: { code },
    });
  }

  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    return prisma.$transaction(fn, options);
  }

  async lockProductsForUpdate(productIds: string[], tx: Prisma.TransactionClient) {
    return tx.$queryRaw<{ id: string; stock: number }[]>(
      Prisma.sql`SELECT id, stock FROM "products" WHERE id IN (${Prisma.join(productIds)}) FOR UPDATE`
    );
  }

  async decrementProductStock(productId: string, quantity: number, tx: Prisma.TransactionClient) {
    return tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });
  }

  async createOrder(data: Prisma.OrderCreateInput, tx: Prisma.TransactionClient) {
    return tx.order.create({ data });
  }

  async createOrderAuditLog(data: Prisma.OrderAuditLogCreateInput, tx: Prisma.TransactionClient) {
    return tx.orderAuditLog.create({ data });
  }

  async clearCartItems(cartId: string, tx: Prisma.TransactionClient) {
    return tx.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async createPaymentRecord(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  }
}

export const checkoutRepository = new CheckoutRepository();
