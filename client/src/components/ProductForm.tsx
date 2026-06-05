"use client";

import { useEffect, useState } from "react";
import {
  productSchema,
  type ProductFormValues,
  type ProductData,
} from "../schemas/productSchema";
import { z } from "zod";

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  onSubmit: (data: ProductData) => Promise<unknown>;
  loading: boolean;
}

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  basePrice: "",
  stock: "",
  categoryId: "",
  images: [],
  isVisible: true,
};

export function ProductForm({ onSubmit, loading }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(EMPTY);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories from the API on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/categories`)
      .then((r) => r.json())
      .then((res) => {
        const cats = res.data ?? res;
        // Filter out 'uncategorized' (migration safety category — not for user selection)
        setCategories(
          (cats as Category[]).filter((c) => c.slug !== "uncategorized")
        );
      })
      .catch(() => {
        // Fallback: leave categories empty — user sees the empty select
      });
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleAddImage() {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), trimmed] }));
    setImageUrlInput("");
    if (errors.images) setErrors((prev) => { const n = { ...prev }; delete n.images; return n; });
  }

  function handleRemoveImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    try {
      const validatedData = productSchema.parse(form);
      await onSubmit(validatedData);
      setForm(EMPTY);
      setImageUrlInput("");
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        setServerError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      }
    }
  }

  return (
    <form
      id="add"
      onSubmit={handleSubmit}
      className="form-section"
      noValidate
    >
      <div className="form-section-title">
        <span className="form-section-title-icon"><IconPlus /></span>
        Add New Product
      </div>

      {serverError && (
        <div className="alert alert-error" role="alert">
          {serverError}
        </div>
      )}

      <div className="form-grid">
        {/* Name */}
        <div className="form-field">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Mechanical Keyboard"
            className={errors.name ? "input-error" : ""}
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-required="true"
          />
          {errors.name && (
            <span id="name-error" className="error-text" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="form-field">
          <label htmlFor="categoryId">Category *</label>
          <select
            id="categoryId"
            name="categoryId"
            value={form.categoryId ?? ""}
            onChange={handleChange}
            className={errors.categoryId ? "input-error" : ""}
            aria-describedby={errors.categoryId ? "category-error" : undefined}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span id="category-error" className="error-text" role="alert">
              {errors.categoryId}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="form-field">
          <label htmlFor="basePrice">Price (₹) *</label>
          <input
            id="basePrice"
            name="basePrice"
            type="text"
            inputMode="decimal"
            value={form.basePrice as string}
            onChange={handleChange}
            placeholder="999.00"
            className={errors.basePrice ? "input-error" : ""}
            aria-describedby={errors.basePrice ? "price-error" : undefined}
            aria-required="true"
          />
          {errors.basePrice && (
            <span id="price-error" className="error-text" role="alert">
              {errors.basePrice}
            </span>
          )}
        </div>

        {/* Stock */}
        <div className="form-field">
          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            name="stock"
            type="text"
            inputMode="numeric"
            value={form.stock as string}
            onChange={handleChange}
            placeholder="100"
            className={errors.stock ? "input-error" : ""}
            aria-describedby={errors.stock ? "stock-error" : undefined}
          />
          {errors.stock && (
            <span id="stock-error" className="error-text" role="alert">
              {errors.stock}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="form-field full-width">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            placeholder="Briefly describe the product…"
            rows={3}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
          {errors.description && (
            <span id="description-error" className="error-text" role="alert">
              {errors.description}
            </span>
          )}
        </div>

        {/* Images */}
        <div className="form-field full-width">
          <label htmlFor="imageUrlInput">Image URLs</label>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              id="imageUrlInput"
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImage(); } }}
              placeholder="https://images.unsplash.com/…"
              style={{ flex: 1 }}
              aria-describedby={errors.images ? "images-error" : undefined}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddImage}
              disabled={!imageUrlInput.trim()}
            >
              Add
            </button>
          </div>
          {(form.images ?? []).length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: "var(--space-2)" }}>
              {(form.images ?? []).map((url, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)", fontSize: "0.85rem", padding: "2px 0" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                  <button type="button" onClick={() => handleRemoveImage(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", flexShrink: 0 }}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {errors.images && (
            <span id="images-error" className="error-text" role="alert">
              {errors.images}
            </span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setForm(EMPTY);
            setImageUrlInput("");
            setErrors({});
            setServerError(null);
          }}
          disabled={loading}
        >
          Reset
        </button>
        <button
          type="submit"
          className={`btn btn-primary${loading ? " btn-loading" : ""}`}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Adding…" : "Add Product"}
        </button>
      </div>
    </form>
  );
}
