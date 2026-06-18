import apiClient from "../../../lib/apiClient";
import type { Product, ProductData } from "../types/productSchema";

// ─── API response envelopes ─────────────────────────────────────────────────

interface ApiListResponse<T> {
  data: T[];
  total: number;
}

interface ApiSingleResponse<T> {
  data: T;
  message?: string;
}

// ─── Product API service ────────────────────────────────────────────────────

export const productService = {
  /** GET /api/products?category=electronics&search=keyboard */
  getAll: (params?: {
    category?: string;
    search?: string;
  }): Promise<ApiListResponse<Product>> =>
    apiClient.get("/products", { params }),

  /** GET /api/products/:id  — id is a UUID string */
  getById: (id: string): Promise<ApiSingleResponse<Product>> =>
    apiClient.get(`/products/${id}`),

  /** POST /api/products */
  create: (data: ProductData): Promise<ApiSingleResponse<Product>> =>
    apiClient.post("/products", data),

  /** PUT /api/products/:id  — id is a UUID string */
  update: (
    id: string,
    data: Partial<ProductData>
  ): Promise<ApiSingleResponse<Product>> =>
    apiClient.put(`/products/${id}`, data),

  /** DELETE /api/products/:id  — id is a UUID string */
  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/products/${id}`),

  /** GET /api/health */
  checkHealth: (): Promise<{ status: string; message: string; timestamp: string }> =>
    apiClient.get("/health"),
};
