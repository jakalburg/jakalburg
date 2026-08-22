import { useMemo } from "react";
import type { AxiosInstance } from "axios";
import { mockAxios } from "@/lib/mock-api";

// ---------------------------------------------------------------------------
// UI-only build: this is the single seam where the admin talks to a backend.
//
// Every authenticated request in the app flows through `useAxiosAuth()` — all
// services, data hooks, and components that call it directly. Instead of a real
// `axios.create(...)` with a NextAuth Bearer interceptor, it returns a mock
// axios instance that resolves requests from local data (see `@/lib/mock-api`).
//
// To reconnect a real backend later: restore the original implementation here
// (axios.create + auth interceptor). No service/hook/component call site needs
// to change — they all consume this hook's returned instance.
// ---------------------------------------------------------------------------

const useAxiosAuth = (): AxiosInstance => {
  // Stable identity across renders so react-query effects don't re-fire.
  return useMemo(() => mockAxios, []);
};

export default useAxiosAuth;
