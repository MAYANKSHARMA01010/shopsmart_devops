"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../features/auth/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "VENDOR"))) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (!mounted || isLoading) {
    return <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>Loading Dashboard...</div>;
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "VENDOR")) {
    return null;
  }

  const links = [
    { label: "Overview", href: "/dashboard" },
    { label: "Products", href: "/dashboard/products" },
    { label: "Orders", href: "/dashboard/orders" },
  ];

  if (user.role === "SUPER_ADMIN") {
    links.push({ label: "Categories", href: "/dashboard/categories" });
    links.push({ label: "Users", href: "/dashboard/users" });
  }

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)", background: "var(--color-background)" }}>
      {/* Sidebar */}
      <aside style={{ width: "250px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "2rem 1rem" }}>
        <div style={{ marginBottom: "2rem", padding: "0 1rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Dashboard</h2>
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            {user.role} View
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  color: isActive ? "white" : "var(--color-text)",
                  background: isActive ? "var(--color-primary)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  transition: "background 0.2s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
