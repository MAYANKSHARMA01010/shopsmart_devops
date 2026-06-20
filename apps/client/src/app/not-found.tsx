import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | ShopSmart",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "8rem 0", textAlign: "center", minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ fontSize: "6rem", margin: 0, color: "var(--color-primary)" }}>404</h1>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Page Not Found</h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem", maxWidth: "400px" }}>
        Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link href="/" className="btn btn-primary" style={{ padding: "0.75rem 2rem" }}>
        Return Home
      </Link>
    </div>
  );
}
