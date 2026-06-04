"use client";

import { useState } from "react";
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


interface ProductFormProps {
  onSubmit: (data: ProductData) => Promise<unknown>;
  loading: boolean;
}

const CATEGORIES = [
  "Electronics", "Clothing", "Food", "Books",
  "Sports", "Toys", "Beauty", "Home", "Tools",
];

const EMPTY: ProductFormValues = {
  name:        "",
  description: "",
  price:       "",
  stock:       "",
  category:    "",
  imageUrl:    "",
};

export function ProductForm({ onSubmit, loading }: ProductFormProps) {
  const [form, setForm]             = useState<ProductFormValues>(EMPTY);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    try {
      const validatedData = productSchema.parse(form);
      await onSubmit(validatedData);
      setForm(EMPTY);
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
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category || ""}
            onChange={handleChange}
            aria-describedby={errors.category ? "category-error" : undefined}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat.toLowerCase()}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <span id="category-error" className="error-text" role="alert">
              {errors.category}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="form-field">
          <label htmlFor="price">Price ($) *</label>
          <input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            value={form.price}
            onChange={handleChange}
            placeholder="29.99"
            className={errors.price ? "input-error" : ""}
            aria-describedby={errors.price ? "price-error" : undefined}
            aria-required="true"
          />
          {errors.price && (
            <span id="price-error" className="error-text" role="alert">
              {errors.price}
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
            value={form.stock}
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

        {/* Image URL */}
        <div className="form-field full-width">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            value={form.imageUrl || ""}
            onChange={handleChange}
            placeholder="https://images.unsplash.com/…"
            aria-describedby={errors.imageUrl ? "imageurl-error" : undefined}
          />
          {errors.imageUrl && (
            <span id="imageurl-error" className="error-text" role="alert">
              {errors.imageUrl}
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
