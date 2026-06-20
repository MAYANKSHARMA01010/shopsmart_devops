"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "../../features/cart/store/cartStore";
import { formatPrice } from "../../features/products/types/productSchema";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, clearCart, isLoading } = useCartStore();
  const items = cart?.items || [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <p>Loading Cart...</p>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + Number.parseFloat(String(item.product.basePrice)) * item.quantity, 0);

  return (
    <div className="container" style={{ padding: "2rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Shopping Cart</h1>
        {items.length > 0 && (
          <button onClick={() => clearCart()} className="btn btn-secondary">
            Empty Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "3rem", textAlign: "center", padding: "4rem 2rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <h3>Your cart is empty</h3>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>Looks like you haven&apos;t added any products to your cart yet.</p>
          <Link href="/products" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem", alignItems: "start" }}>
          {/* Cart Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: "1.5rem", padding: "1.5rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                <Link href={`/products/${item.productId}`} style={{ flexShrink: 0, display: "block", position: "relative", width: "100px", height: "100px", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--color-background)" }}>
                  {item.product.images[0] ? (
                    <Image src={item.product.images[0]} alt={item.product.name} fill style={{ objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>No Image</div>
                  )}
                </Link>
                
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <Link href={`/products/${item.productId}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 600, fontSize: "1.125rem" }}>
                        {item.product.name}
                      </Link>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        Price: ${formatPrice(item.product.basePrice)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                      ${formatPrice(Number.parseFloat(String(item.product.basePrice)) * item.quantity)}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isLoading}
                        style={{ padding: "0.25rem 0.75rem", background: "transparent", border: "none", cursor: item.quantity <= 1 ? "not-allowed" : "pointer" }}
                      >
                        -
                      </button>
                      <div style={{ padding: "0.25rem 0.75rem", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", minWidth: "40px", textAlign: "center" }}>
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock || isLoading}
                        style={{ padding: "0.25rem 0.75rem", background: "transparent", border: "none", cursor: item.quantity >= item.product.stock ? "not-allowed" : "pointer" }}
                      >
                        +
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeItem(item.productId)}
                      style={{ color: "var(--color-danger)", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "sticky", top: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 1.5rem 0", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>Order Summary</h2>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "1rem", borderTop: "1px solid var(--color-border)", marginBottom: "1.5rem", fontWeight: 600, fontSize: "1.25rem" }}>
              <span>Total</span>
              <span>${formatPrice(subtotal)}</span>
            </div>

            <button 
              onClick={() => router.push("/checkout")}
              className="btn btn-primary"
              style={{ width: "100%", padding: "1rem", fontSize: "1.125rem" }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
