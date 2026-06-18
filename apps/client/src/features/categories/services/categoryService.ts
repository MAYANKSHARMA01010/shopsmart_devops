import apiClient from "../../../lib/apiClient";
import type { ApiResponse } from "@shopsmart/api-contracts";
import type {
  CategoryCreateInput,
  CategoryNode,
  CategoryUpdateInput,
} from "../types/categorySchema";

export const categoryService = {
  /** GET /api/categories */
  getTree: (): Promise<ApiResponse<CategoryNode[]>> => apiClient.get("/categories"),

  /** GET /api/categories/:id */
  getById: (id: string): Promise<ApiResponse<CategoryNode>> =>
    apiClient.get(`/categories/${id}`),

  /** POST /api/categories */
  create: (data: CategoryCreateInput): Promise<ApiResponse<CategoryNode>> =>
    apiClient.post("/categories", data),

  /** PUT /api/categories/:id */
  update: (
    id: string,
    data: CategoryUpdateInput
  ): Promise<ApiResponse<CategoryNode>> => apiClient.put(`/categories/${id}`, data),

  /** DELETE /api/categories/:id */
  delete: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/categories/${id}`),
};
