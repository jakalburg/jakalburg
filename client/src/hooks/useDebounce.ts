import { useEffect, useState } from "react";

/**
 * Delay a fast-changing value (a search box, typically) so downstream effects
 * and queries fire once the user pauses instead of on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
