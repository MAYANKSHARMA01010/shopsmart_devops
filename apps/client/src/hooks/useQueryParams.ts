import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Updates the URL search parameters and pushes the new URL.
   * Passing `null` or `undefined` or `""` as a value will remove the parameter.
   */
  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      let hasChanges = false;

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          if (params.has(key)) {
            params.delete(key);
            hasChanges = true;
          }
        } else {
          if (params.get(key) !== value) {
            params.set(key, value);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        router.push(`${pathname}?${params.toString()}`);
      }
    },
    [searchParams, pathname, router]
  );

  return { searchParams, setParams };
}
