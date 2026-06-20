"use client";

import { useEffect, useState } from "react";
import { orderService } from "../../../features/orders/services/orderService";
import type { Order } from "../../../features/orders/types/orderSchema";
import { formatPrice } from "../../../features/products/types/productSchema";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await orderService.getAllOrders();
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    let trackingNumber: string | undefined = undefined;
    
    if (newStatus === "SHIPPED") {
      const input = prompt("Enter tracking number (optional):");
      if (input !== null && input.trim() !== "") {
        trackingNumber = input.trim();
      } else if (input === null) {
        // User cancelled the prompt, so don't update status
        return;
      }
    }

    try {
      await orderService.updateOrderStatus(orderId, newStatus, trackingNumber);
      alert("Order status updated successfully!");
      // Optimistic update
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any, trackingNumber: trackingNumber || (o as any).trackingNumber } : o));
    } catch (error: any) {
      console.error("Failed to update status", error);
      alert(error?.response?.data?.message || "Failed to update status");
    }
  };

  if (isLoading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: "2rem", margin: 0 }}>Order Management</h1>

      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "var(--color-background)" }}>
            <tr>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Order ID</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Date</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Customer</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Total</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Tracking</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "1rem", color: "var(--color-text-muted)" }}>{order.id.slice(0, 8)}...</td>
                <td style={{ padding: "1rem" }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "1rem" }}>{(order as any).user?.name || "Guest"}</td>
                <td style={{ padding: "1rem" }}>${formatPrice(order.totalAmount)}</td>
                <td style={{ padding: "1rem" }}>{(order as any).trackingNumber || "-"}</td>
                <td style={{ padding: "1rem" }}>
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text)" }}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
