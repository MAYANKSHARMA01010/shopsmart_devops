import { useState, useCallback, useEffect } from "react";
import { productService } from "../services/productService";
import type { Product, ProductData } from "../types/productSchema";

export function useProducts(filters: { search: string; category: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // id is now a UUID string, not a number
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getAll({
        search: filters.search || undefined,
        category: filters.category !== "all" ? filters.category : undefined,
      });
      // Unwrap from { data: Product[], total: number } envelope
      setProducts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.category]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const addProduct = async (data: ProductData): Promise<Product | undefined> => {
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await productService.create(data);
      const product = response.data;
      setProducts((prev) => [product, ...prev]);
      setSuccess(`"${product.name}" has been added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      return product;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setAdding(false);
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSuccess("Product deleted.");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    products,
    loading,
    error,
    success,
    adding,
    deletingId,
    addProduct,
    deleteProduct,
    refresh: fetchProducts,
  };
}
