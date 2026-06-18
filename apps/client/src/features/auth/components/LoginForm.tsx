"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import Link from "next/link";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ identifier, password });
      router.push("/products");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "420px", margin: "40px auto", width: "100%", padding: "32px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", marginBottom: "8px", textAlign: "center", color: "var(--color-text-primary)" }}>
        Welcome Back
      </h2>
      <p style={{ color: "var(--color-text-secondary)", textAlign: "center", marginBottom: "24px", fontSize: "14px" }}>
        Sign in to manage your e-commerce catalog
      </p>

      {error && (
        <div
          style={{
            background: "var(--color-error-surface)",
            border: "1px solid var(--color-error-border)",
            color: "var(--color-error)",
            padding: "12px",
            borderRadius: "var(--radius)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            Email or Username
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email or username"
            required
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <button
          type="submit"
          className={`btn btn-primary ${isSubmitting ? "btn-loading" : ""}`}
          disabled={isSubmitting}
          style={{ marginTop: "8px", height: "42px" }}
        >
          {isSubmitting ? "" : "Sign In"}
        </button>
      </form>

      <p style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--color-text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
          Create one
        </Link>
      </p>
    </div>
  );
}
