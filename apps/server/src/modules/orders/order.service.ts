import prisma from '../../shared/config/database';

export class OrderService {
  async getMyOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string, role: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                basePrice: true,
              }
            }
          }
        },
        address: true,
      },
    });

    if (!order) return null;

    // Check permissions
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && order.userId !== userId) {
      throw new Error('Forbidden: You do not have access to this order');
    }

    return order;
  }

  async getAllOrders() {
    return prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    const dataToUpdate: any = { status };
    if (trackingNumber !== undefined) {
      dataToUpdate.trackingNumber = trackingNumber;
    }
    
    return prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
    });
  }
}

export const orderService = new OrderService();
