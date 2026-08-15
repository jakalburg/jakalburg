import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
// Returns true after client-side mount. Use this to gate rendering of any
// content that reads persisted state, so SSR HTML matches first paint.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
