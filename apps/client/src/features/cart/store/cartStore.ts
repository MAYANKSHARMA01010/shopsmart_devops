import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartService } from "../services/cartService";
import { useAuthStore } from "../../auth/store/authStore";
import type { Cart, CartItem, CartProduct } from "../types/cartSchema";

interface CartState {
  cart: Cart;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (product: CartProduct, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  resetCart: () => void;
}

const getEmptyCart = (): Cart => ({
  id: "guest",
  userId: "guest",
  items: [],
  totalItems: 0,
  subtotal: "0.00",
});

const computeGuestTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items
    .reduce((sum, item) => {
      if (!item.product.isVisible) return sum;
      return sum + Number.parseFloat(item.product.basePrice) * item.quantity;
    }, 0)
    .toFixed(2);
  return { totalItems, subtotal };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: getEmptyCart(),
      isLoading: false,
      error: null,

      fetchCart: async () => {
        const token = useAuthStore.getState().accessToken;
        if (!token) return; // Guest mode - keep local cart

        set({ isLoading: true, error: null });
        try {
          const res = await cartService.getCart();
          if (res.success) {
            set({ cart: res.data });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to fetch cart";
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (product: CartProduct, quantity: number) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          // Authenticated Sync
          set({ isLoading: true, error: null });
          try {
            const res = await cartService.addItem(product.id, quantity);
            if (res.success) {
              set({ cart: res.data });
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to add item";
            set({ error: message });
            throw err;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Guest local updates
          const currentCart = get().cart;
          const existingItemIndex = currentCart.items.findIndex(
            (item) => item.productId === product.id
          );

          let newItems = [...currentCart.items];

          if (existingItemIndex > -1) {
            const existingItem = newItems[existingItemIndex];
            const newQty = Math.min(existingItem.quantity + quantity, product.stock, 10);
            
            const warnings: string[] = [];
            if (!product.isVisible) {
              warnings.push("This product is currently unavailable.");
            } else if (product.stock <= 0 || newQty > product.stock) {
              warnings.push("Requested quantity exceeds available stock.");
            }

            newItems[existingItemIndex] = {
              ...existingItem,
              quantity: newQty,
              warnings,
            };
          } else {
            if (currentCart.items.length >= 50) {
              throw new Error("Cannot add item. Cart has reached maximum limit of 50 unique items.");
            }

            const newQty = Math.min(quantity, product.stock, 10);
            const warnings: string[] = [];
            if (!product.isVisible) {
              warnings.push("This product is currently unavailable.");
            } else if (product.stock <= 0 || newQty > product.stock) {
              warnings.push("Requested quantity exceeds available stock.");
            }

            newItems.push({
              id: `guest-${Math.random().toString(36).substring(2, 9)}`,
              productId: product.id,
              quantity: newQty,
              product,
              warnings,
            });
          }

          const { totalItems, subtotal } = computeGuestTotals(newItems);
          set({
            cart: {
              ...currentCart,
              items: newItems,
              totalItems,
              subtotal,
            },
          });
        }
      },

      updateQuantity: async (productId: string, quantity: number) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          // Authenticated Sync
          set({ isLoading: true, error: null });
          try {
            const res = await cartService.updateQuantity(productId, quantity);
            if (res.success) {
              set({ cart: res.data });
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update quantity";
            set({ error: message });
            throw err;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Guest local updates
          const currentCart = get().cart;
          const itemIndex = currentCart.items.findIndex(
            (item) => item.productId === productId
          );

          if (itemIndex > -1) {
            const item = currentCart.items[itemIndex];
            const stock = item.product.stock;
            const newQty = Math.min(quantity, stock, 10);

            const warnings: string[] = [];
            if (!item.product.isVisible) {
              warnings.push("This product is currently unavailable.");
            } else if (stock <= 0 || newQty > stock) {
              warnings.push("Requested quantity exceeds available stock.");
            }

            const newItems = [...currentCart.items];
            newItems[itemIndex] = {
              ...item,
              quantity: newQty,
              warnings,
            };

            const { totalItems, subtotal } = computeGuestTotals(newItems);
            set({
              cart: {
                ...currentCart,
                items: newItems,
                totalItems,
                subtotal,
              },
            });
          }
        }
      },

      removeItem: async (productId: string) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          // Authenticated Sync
          set({ isLoading: true, error: null });
          try {
            const res = await cartService.removeItem(productId);
            if (res.success) {
              set({ cart: res.data });
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to remove item";
            set({ error: message });
            throw err;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Guest local updates
          const currentCart = get().cart;
          const newItems = currentCart.items.filter((item) => item.productId !== productId);
          const { totalItems, subtotal } = computeGuestTotals(newItems);
          set({
            cart: {
              ...currentCart,
              items: newItems,
              totalItems,
              subtotal,
            },
          });
        }
      },

      clearCart: async () => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          // Authenticated Sync
          set({ isLoading: true, error: null });
          try {
            const res = await cartService.clearCart();
            if (res.success) {
              set({ cart: getEmptyCart() });
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to clear cart";
            set({ error: message });
            throw err;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Guest local updates
          set({ cart: getEmptyCart() });
        }
      },

      mergeGuestCart: async () => {
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        const currentCart = get().cart;
        if (currentCart.items.length === 0) return;

        set({ isLoading: true, error: null });
        try {
          const guestPayload = currentCart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }));

          const res = await cartService.mergeCart(guestPayload);
          if (res.success) {
            set({ cart: res.data });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to merge cart";
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      resetCart: () => {
        set({ cart: getEmptyCart(), error: null });
      },
    }),
    {
      name: "shopsmart-cart",
      // Only persist the cart state
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
