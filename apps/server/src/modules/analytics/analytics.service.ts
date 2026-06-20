import prisma from '../../shared/config/database';

export class AnalyticsService {
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get basic stats
    const [totalOrders, ordersToday, activeProducts] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }),
      prisma.product.count({
        where: {
          stock: { gt: 0 },
        },
      }),
    ]);

    // Calculate total revenue from all orders
    const allOrders = await prisma.order.findMany({
      select: {
        totalAmount: true,
      },
    });

    const totalRevenue = allOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Generate sales data for the last 7 days for charts
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        select: {
          totalAmount: true,
        },
      });

      const dayRevenue = dayOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      salesData.push({
        date: date.toISOString().split('T')[0],
        sales: dayRevenue,
        orders: dayOrders.length,
      });
    }

    return {
      totalRevenue,
      totalOrders,
      ordersToday,
      activeProducts,
      salesData,
    };
  }
}

export const analyticsService = new AnalyticsService();
