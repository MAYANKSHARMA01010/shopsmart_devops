"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryNode } from "../types/categorySchema";
import { categoryService } from "../services/categoryService";

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  includeAll?: boolean;
  ariaLabel?: string;
}

interface CategoryOption {
  value: string;
  label: string;
}

const buildOptions = (nodes: CategoryNode[], depth = 0): CategoryOption[] => {
  const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
  return nodes.flatMap((node) => {
    const current: CategoryOption = {
      value: node.slug,
      label: `${prefix}${node.name}`,
    };
    const children = buildOptions(node.children ?? [], depth + 1);
    return [current, ...children];
  });
};

export function CategoryFilter({
  value,
  onChange,
  id = "category-filter",
  className,
  includeAll = false,
  ariaLabel = "Filter by category",
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    categoryService
      .getTree()
      .then((response) => {
        if (!active) return;
        setCategories(response.data ?? []);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load categories");
        setCategories([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(() => buildOptions(categories), [categories]);

  return (
    <select
      id={id}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {includeAll && <option value="all">All Categories</option>}
      {loading && <option value="" disabled>Loading categories...</option>}
      {!loading && error && <option value="" disabled>{error}</option>}
      {!loading && !error &&
        options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
    </select>
  );
}
