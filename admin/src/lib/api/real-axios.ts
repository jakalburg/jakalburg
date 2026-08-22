import axios, { AxiosInstance } from "axios";
import config from "@/config/config";

// ---------------------------------------------------------------------------
// Real backend client (products only).
//
// The rest of the admin still runs on the mock seam (`useAxiosAuth` →
// mockAxios). Products are the first entity wired to the real NestJS server, so
// `products.service.ts` talks through THIS instance instead of the mock one.
//
// Base URL comes from `config.ts` (NEXT_PUBLIC_API_URL_DEV, default
// http://localhost:8080/api). Endpoints in `config/endpoints.ts` are relative
// (e.g. "/products/admin/list"), so the final URL is `${baseURL}${endpoint}`.
//
// AUTH: the admin still uses a mock auth session (no real JWT), and the
// server's product write routes are intentionally UNGUARDED for local dev, so
// there is no Authorization header yet. When real admin auth lands, attach the
// Bearer token in the request interceptor below and add JwtAuthGuard +
// RolesGuard('admin') on the server routes at the same time.
// ---------------------------------------------------------------------------

export const realApi: AxiosInstance = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: { "Content-Type": "application/json" },
});

realApi.interceptors.request.use((cfg) => {
  // Placeholder for future admin JWT:
  // const token = getAdminAccessToken();
  // if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default realApi;
