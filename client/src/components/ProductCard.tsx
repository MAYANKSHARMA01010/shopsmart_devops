import { formatPrice } from "../schemas/productSchema";
import type { Product } from "../schemas/productSchema";

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
  deleting: boolean;
}

/* ── SVG placeholder icon ─────────────────────────────────────────────────── */

function IconProductPlaceholder() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--color-text-muted)" }}
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

/* ── Stock helpers ────────────────────────────────────────────────────────── */

function getStockClass(stock: number): string {
  if (stock === 0) return "out-stock";
  if (stock < 5) return "low-stock";
  return "in-stock";
}

function getStockLabel(stock: number): string {
  if (stock === 0) return "Out of stock";
  if (stock < 5) return `Low stock — ${stock} left`;
  return `${stock} in stock`;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function ProductCard({ product, onDelete, deleting }: ProductCardProps) {
  return (
    <article className="product-card">
      {/* Image / placeholder */}
      <div className="product-image">
        {product.images && product.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            width={280}
            height={160}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        ) : (
          <IconProductPlaceholder />
        )}
      </div>

      {/* Body */}
      <div className="product-body">
        {product.category && (
          <span className="product-category">{product.category.name}</span>
        )}
        <h2 className="product-name">{product.name}</h2>
        {product.description && (
          <p className="product-desc">{product.description}</p>
        )}

        {/* Footer: price + stock */}
        <div className="product-footer">
          <span
            className="product-price"
            aria-label={`Price: ₹${formatPrice(product.basePrice)}`}
          >
            ₹{formatPrice(product.basePrice)}
          </span>
          <span
            className={`product-stock ${getStockClass(product.stock)}`}
            aria-label={getStockLabel(product.stock)}
          >
            {getStockLabel(product.stock)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="product-actions">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(product.id)}
          disabled={deleting}
          aria-label={`Delete ${product.name}`}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
