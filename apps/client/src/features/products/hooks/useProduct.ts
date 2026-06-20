import { useState, useEffect, useCallback } from "react";
import { productService } from "../services/productService";
import type { Product } from "../types/productSchema";

export function useProduct(productId: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await productService.getById(id);
      setProduct(response.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch product");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    } else {
      setIsLoading(false);
    }
  }, [productId, fetchProduct]);

  return { product, isLoading, error, refetch: () => productId && fetchProduct(productId) };
}
