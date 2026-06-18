"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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



function ProductsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "all";
  const urlMinPrice = searchParams.get("minPrice") || "";
  const urlMaxPrice = searchParams.get("maxPrice") || "";
  const urlSort = searchParams.get("sort") || "newest";
  const urlPage = searchParams.get("page") || "1";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [minPriceInput, setMinPriceInput] = useState(urlMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(urlMaxPrice);
  const [showForm, setShowForm] = useState(false);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || (key === "category" && value === "all") || (key === "page" && value === "1") || (key === "sort" && value === "newest")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Reset page to 1 on any filter change
      if (!updates.page && params.has("page")) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlSearch) {
        updateQuery({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, updateQuery]);

  // Debounce Price Range
  useEffect(() => {
    const timer = setTimeout(() => {
      if (minPriceInput !== urlMinPrice || maxPriceInput !== urlMaxPrice) {
        updateQuery({ minPrice: minPriceInput, maxPrice: maxPriceInput });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [minPriceInput, maxPriceInput, urlMinPrice, urlMaxPrice, updateQuery]);

  const {
    products,
    loading,
    error,
    success,
    adding,
    deletingId,
    page,
    totalPages,
    total,
    addProduct,
    deleteProduct,
  } = useProducts({
    search: urlSearch,
    category: urlCategory,
    minPrice: urlMinPrice,
    maxPrice: urlMaxPrice,
    sort: urlSort,
    page: urlPage,
  });

  // Calculate stats from loaded page (for enterprise logic, stats might be separate query)
  const totalValue = products.reduce(
    (sum, p) => sum + parseFloat(formatPrice(p.basePrice)) * p.stock,
    0
  );
  const inStock = products.filter((p) => p.stock > 0).length;

  async function handleAddProduct(data: ProductData) {
    const result = await addProduct(data);
    if (result) setShowForm(false);
  }

  const isFiltered = !!(urlSearch || urlCategory !== "all" || urlMinPrice || urlMaxPrice);

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>
            {loading
              ? "Loading catalog…"
              : `${total} product${total !== 1 ? "s" : ""} in catalog`}
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

      {/* Stats */}
      {!loading && total > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><IconBox /></div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><IconCheckCircle /></div>
            <div className="stat-value">{inStock}</div>
            <div className="stat-label">In Stock (Current Page)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><IconDollar /></div>
            <div className="stat-value">
              ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Inventory Value (Current Page)</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {/* Filter bar */}
      <div className="filter-bar" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <input
          id="product-search"
          className="filter-search"
          type="search"
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search products"
        />
        <CategoryFilter
          id="category-filter"
          className="filter-select"
          value={urlCategory}
          onChange={(val) => updateQuery({ category: val })}
          includeAll
        />
        <select
          className="filter-select"
          value={urlSort}
          onChange={(e) => updateQuery({ sort: e.target.value })}
          aria-label="Sort products"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="number"
            placeholder="Min ₹"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="filter-search"
            style={{ width: "100px" }}
            aria-label="Minimum Price"
          />
          <span style={{ color: "var(--color-text-muted)" }}>-</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="filter-search"
            style={{ width: "100px" }}
            aria-label="Maximum Price"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
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
                  onClick={() => {
                    setSearchInput("");
                    setMinPriceInput("");
                    setMaxPriceInput("");
                    updateQuery({ search: null, category: "all", minPrice: null, maxPrice: null });
                  }}
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
        <>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "2rem" }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => updateQuery({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => updateQuery({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Product form */}
      {showForm && (
        <div id="add" className="form-reveal" style={{ marginTop: "var(--space-8)" }}>
          <ProductForm onSubmit={handleAddProduct} loading={adding} />
        </div>
      )}

      <div style={{ paddingBottom: "var(--space-16)" }} />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container"><div className="skeleton-grid" aria-busy="true" style={{ marginTop: '2rem' }}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
