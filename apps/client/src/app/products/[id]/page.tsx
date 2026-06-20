"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useProduct } from "../../../features/products/hooks/useProduct";
import { formatPrice } from "../../../features/products/types/productSchema";
import { useCartStore } from "../../../features/cart/store/cartStore";
import { useWishlistStore } from "../../../features/wishlist/store/wishlistStore";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailsPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const { product, isLoading, error } = useProduct(id);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <p>Loading Product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2 style={{ color: "var(--color-danger)" }}>Oops!</h2>
        <p>{error || "Product not found"}</p>
        <Link href="/products" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
          Back to Products
        </Link>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const discount =
    product.comparePrice && product.comparePrice > product.basePrice
      ? Math.round(((product.comparePrice - product.basePrice) / product.comparePrice) * 100)
      : 0;

  const handleAddToCart = async () => {
    const cartProduct = {
      ...product,
      basePrice: String(product.basePrice),
      comparePrice: product.comparePrice != null ? String(product.comparePrice) : null,
    };
    try {
      await addItem(cartProduct, quantity);
      alert("Added to cart!");
    } catch (err: any) {
      alert(err.message || "Failed to add to cart");
    }
  };

  const handleWishlistToggle = async () => {
    try {
      await toggleItem(product);
    } catch (err) {
      console.error("Wishlist error", err);
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 0" }}>
      <Link href="/products" style={{ color: "var(--color-text-muted)", textDecoration: "none", display: "inline-block", marginBottom: "2rem" }}>
        &larr; Back to Products
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem" }}>
        {/* Left: Image Gallery */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {product.images.length > 0 ? (
              <Image
                src={product.images[activeImageIndex]}
                alt={product.name}
                fill
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
                No Image Available
              </div>
            )}
            {discount > 0 && (
              <div style={{ position: "absolute", top: "1rem", left: "1rem", backgroundColor: "var(--color-danger)", color: "white", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontWeight: "bold", fontSize: "0.875rem" }}>
                {discount}% OFF
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    flexShrink: 0,
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: activeImageIndex === idx ? "2px solid var(--color-primary)" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  <Image src={img} alt={`Thumbnail ${idx + 1}`} fill style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              {product.category?.name || "Uncategorized"}
            </div>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{product.name}</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${formatPrice(product.basePrice)}</span>
              {product.comparePrice && product.comparePrice > product.basePrice && (
                <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)" }}>
                  ${formatPrice(product.comparePrice)}
                </span>
              )}
            </div>
          </div>

          <div style={{ lineHeight: 1.6, color: "var(--color-text-muted)" }}>
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p>No description available.</p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <span style={{ fontWeight: 500 }}>Availability:</span>
            {product.stock > 0 ? (
              <span style={{ color: "var(--color-success)", fontWeight: "bold" }}>In Stock ({product.stock} left)</span>
            ) : (
              <span style={{ color: "var(--color-danger)", fontWeight: "bold" }}>Out of Stock</span>
            )}
          </div>

          {product.stock > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ padding: "0.5rem 1rem", background: "var(--color-surface)", border: "none", cursor: "pointer" }}
                >
                  -
                </button>
                <div style={{ padding: "0.5rem 1rem", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" }}>
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  style={{ padding: "0.5rem 1rem", background: "var(--color-surface)", border: "none", cursor: "pointer" }}
                >
                  +
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                className="btn btn-primary" 
                style={{ flex: 1, padding: "0.75rem" }}
              >
                Add to Cart
              </button>
              <button 
                onClick={handleWishlistToggle}
                className="btn btn-secondary" 
                style={{ padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                {isWishlisted ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-danger)" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
