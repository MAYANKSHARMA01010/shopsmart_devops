import apiClient from "../../../lib/apiClient";
import type { Order } from "../types/orderSchema";

export const orderService = {
  getMyOrders: (): Promise<{ status: string; data: Order[] }> =>
    apiClient.get("/orders/my-orders"),

  getOrderById: (id: string): Promise<{ status: string; data: { order: Order } }> =>
    apiClient.get(`/orders/${id}`),

  getAllOrders: (): Promise<{ status: string; data: { orders: Order[] } }> =>
    apiClient.get("/orders"),

  updateOrderStatus: (id: string, status: string, trackingNumber?: string): Promise<{ status: string; data: { order: Order } }> =>
    apiClient.patch(`/orders/${id}/status`, { status, trackingNumber }),
};
