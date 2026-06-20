import apiClient from "../../../lib/apiClient";

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  ordersToday: number;
  activeProducts: number;
  salesData: {
    date: string;
    sales: number;
    orders: number;
  }[];
}

export const analyticsService = {
  getOverview: (): Promise<{ status: string; data: AnalyticsOverview }> =>
    apiClient.get("/analytics/overview"),
};
