"use client";

import { useEffect, useState } from "react";
import { analyticsService, type AnalyticsOverview } from "../../features/analytics/services/analyticsService";
import { formatPrice } from "../../features/products/types/productSchema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await analyticsService.getOverview();
        setData(res.data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div>Loading overview...</div>;
  }

  if (error || !data) {
    return (
      <div className="alert alert-error">
        {error || "Failed to load dashboard data"}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>Dashboard Overview</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Revenue</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>${formatPrice(data.totalRevenue)}</div>
        </div>
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Orders</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{data.totalOrders}</div>
        </div>
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Orders Today</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{data.ordersToday}</div>
        </div>
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Active Products</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{data.activeProducts}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Sales Chart */}
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "1.125rem", margin: "0 0 1.5rem 0" }}>Sales (Last 7 Days)</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={data.salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}
                  formatter={(value: any) => [`$${formatPrice(value || 0)}`, "Sales"]}
                />
                <Line type="monotone" dataKey="sales" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "1.125rem", margin: "0 0 1.5rem 0" }}>Orders (Last 7 Days)</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={data.salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}
                  cursor={{ fill: "var(--color-background)" }}
                />
                <Bar dataKey="orders" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
