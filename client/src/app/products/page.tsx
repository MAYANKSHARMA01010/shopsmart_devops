"use client";

import { useState } from "react";
import { useProducts } from "../../features/products/hooks/useProducts";
import type { ProductData } from "../../features/products/types/productSchema";
import { formatPrice } from "../../features/products/types/productSchema";
import { ProductCard } from "@/features/products/components/ProductCard";
import { ProductForm } from "@/features/products/components/ProductForm";
import { CategoryFilter } from "@/features/categories/components/CategoryFilter";



function IconBox({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}



function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-body">
        {/* Category pill */}
        <div className="skeleton skeleton-line skeleton-line-xs" />
        {/* Product name */}
        <div className="skeleton skeleton-line skeleton-line-md" />
        {/* Description line 1 */}
        <div className="skeleton skeleton-line skeleton-line-lg" />
        {/* Description line 2 */}
        <div className="skeleton skeleton-line skeleton-line-sm" />
        {/* Footer: price + badge */}
        <div className="skeleton-footer">
          <div className="skeleton skeleton-line skeleton-line-price" />
          <div className="skeleton skeleton-badge" />
        </div>
      </div>
      <div className="skeleton-actions">
        <div className="skeleton skeleton-btn" />
      </div>
    </div>
  );
}



export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const {
    products,
    loading,
    error,
    success,
    adding,
    deletingId,
    addProduct,
    deleteProduct,
  } = useProducts({ search, category });

  // basePrice comes from API as a Decimal-serialized string (e.g. "7999.00")
  const totalValue = products.reduce(
    (sum, p) => sum + parseFloat(formatPrice(p.basePrice)) * p.stock,
    0
  );
  const inStock = products.filter((p) => p.stock > 0).length;

  async function handleAddProduct(data: ProductData) {
    const result = await addProduct(data);
    if (result) setShowForm(false);
  }

  const isFiltered = !!(search || category !== "all");

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>
            {loading
              ? "Loading catalog…"
              : `${products.length} product${products.length !== 1 ? "s" : ""} in catalog`}
          </p>
        </div>

        <button
          id="add-product-toggle"
          type="button"
          className={`btn ${showForm ? "btn-secondary" : "btn-primary"}`}
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? <><IconMinus />Cancel</> : <><IconPlus />Add Product</>}
        </button>
      </div>

      {/* Stats — only shown when products exist and not loading */}
      {!loading && products.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><IconBox /></div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><IconCheckCircle /></div>
            <div className="stat-value">{inStock}</div>
            <div className="stat-label">In Stock</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><IconDollar /></div>
            <div className="stat-value">
              ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Inventory Value</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          id="product-search"
          className="filter-search"
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
        <CategoryFilter
          id="category-filter"
          className="filter-select"
          value={category}
          onChange={setCategory}
          includeAll
        />
      </div>

      {/* Loading → 6 skeleton cards that match real card dimensions */}
      {loading ? (
        <div className="skeleton-grid" aria-label="Loading products" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

      /* Empty state */
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>

          {isFiltered ? (
            <>
              <h3>No products match</h3>
              <p>Try adjusting your search or filter to find what you are looking for.</p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setSearch(""); setCategory("all"); }}
                >
                  Clear filters
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>No products yet</h3>
              <p>Create your first product to start managing your inventory.</p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowForm(true);
                    setTimeout(() => {
                      document.getElementById("add")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  }}
                >
                  Add Product
                </button>
              </div>
            </>
          )}
        </div>

      /* Product grid */
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={deleteProduct}
              deleting={deletingId === product.id}
            />
          ))}
        </div>
      )}

      {/* Add Product form — lives below the grid, revealed by toggle */}
      {showForm && (
        <div id="add" className="form-reveal" style={{ marginTop: "var(--space-8)" }}>
          <ProductForm onSubmit={handleAddProduct} loading={adding} />
        </div>
      )}

      <div style={{ paddingBottom: "var(--space-16)" }} />
    </div>
  );
}
