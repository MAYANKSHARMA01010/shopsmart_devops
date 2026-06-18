/** Standard single-item API response envelope */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Paginated list response envelope.
 * Returned by all list endpoints that support page/limit.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
