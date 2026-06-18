import apiClient from "../../../lib/apiClient";
import type { Cart } from "../types/cartSchema";

interface ApiCartResponse {
  success: boolean;
  data: Cart;
}

export const cartService = {
  /** GET /api/cart */
  getCart: (): Promise<ApiCartResponse> =>
    apiClient.get("/cart"),

  /** POST /api/cart/items */
  addItem: (productId: string, quantity: number): Promise<ApiCartResponse> =>
    apiClient.post("/cart/items", { productId, quantity }),

  /** PUT /api/cart/items/:productId */
  updateQuantity: (productId: string, quantity: number): Promise<ApiCartResponse> =>
    apiClient.put(`/cart/items/${productId}`, { quantity }),

  /** DELETE /api/cart/items/:productId */
  removeItem: (productId: string): Promise<ApiCartResponse> =>
    apiClient.delete(`/cart/items/${productId}`),

  /** DELETE /api/cart */
  clearCart: (): Promise<{ success: boolean; data: { message: string } }> =>
    apiClient.delete("/cart"),

  /** POST /api/cart/merge */
  mergeCart: (items: Array<{ productId: string; quantity: number }>): Promise<ApiCartResponse> =>
    apiClient.post("/cart/merge", { items }),
};
