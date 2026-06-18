"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productService } from "../features/products/services/productService";

type HealthData = {
  status: string;
  message: string;
  timestamp: string;
  database?: string;
};



function IconBolt() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconServer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconXMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}



const features = [
  {
    Icon: IconBolt,
    title: "Next.js App Router",
    desc: "TypeScript, server & client components, and optimized rendering out of the box.",
  },
  {
    Icon: IconServer,
    title: "Express Backend",
    desc: "REST API with Zod validation and centralized error handling.",
  },
  {
    Icon: IconDatabase,
    title: "PostgreSQL",
    desc: "Production-grade relational database with Prisma ORM and full type safety.",
  },
  {
    Icon: IconShield,
    title: "Type-Safe",
    desc: "Shared Zod schemas enforce validation between frontend and backend simultaneously.",
  },
];



export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .checkHealth()
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            ShopSmart
            <span className="hero-title-accent">Product Manager</span>
          </h1>

          <p className="hero-subtitle">
            A modern full-stack product management system built with Next.js,
            Express, Prisma, and PostgreSQL.
          </p>

          <div className="hero-actions">
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
            <Link href="/products#add" className="btn btn-secondary">
              Add Product
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container">
        {/* Backend Health */}
        <div className="health-card" role="status" aria-live="polite">
          <div
            className={`health-indicator ${
              loading ? "loading" : error ? "error" : "ok"
            }`}
          >
            {loading ? <IconClock /> : error ? <IconXMark /> : <IconCheck />}
          </div>
          <div className="health-info">
            <p className="health-label">Backend Status</p>
            {loading && <p className="health-meta">Pinging Express server…</p>}
            {error && (
              <>
                <p className="health-status-error">Unreachable</p>
                <p className="health-meta">{error}</p>
              </>
            )}
            {health && (
              <>
                <p className="health-status-ok">
                  {health.status.toUpperCase()} — {health.message}
                </p>
                <p className="health-meta">
                  {health.database || "Connected"}&nbsp;|&nbsp;
                  {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="feature-grid">
          {features.map(({ Icon, title, desc }) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon">
                <Icon />
              </div>
              <div className="feature-title">{title}</div>
              <div className="feature-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
