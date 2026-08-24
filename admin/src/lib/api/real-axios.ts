import axios, { AxiosInstance } from "axios";
import config from "@/config/config";
import { getAdminToken, clearAdminToken } from "./admin-token";

// ---------------------------------------------------------------------------
// Real backend client.
//
// Every entity migrated off the mock seam (products, fabrics, uploads, staff,
// customers, orders, website/home-sections, collections) talks through THIS
// instance. The rest of the admin still runs on the mock seam (`useAxiosAuth`
// → mockAxios).
//
// Base URL comes from `config.ts` (NEXT_PUBLIC_API_URL_DEV, default
// http://localhost:8080/api). Endpoints in `config/endpoints.ts` are relative
// (e.g. "/products/admin/list"), so the final URL is `${baseURL}${endpoint}`.
//
// AUTH: the server now guards every admin route (JwtAuthGuard +
// RolesGuard('admin')). The request interceptor attaches the admin JWT stored
// at login (`admin_access_token` cookie); a 401/403 means the token is
// missing/expired/rejected, so we clear it and bounce to /login.
// ---------------------------------------------------------------------------

export const realApi: AxiosInstance = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: { "Content-Type": "application/json" },
});

realApi.interceptors.request.use((cfg) => {
  const token = getAdminToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

realApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && typeof window !== "undefined") {
      clearAdminToken();
      const { pathname, search } = window.location;
      // Avoid a redirect loop if we're already on the login screen.
      if (!pathname.startsWith("/login")) {
        const callbackUrl = encodeURIComponent(pathname + search);
        window.location.assign(`/login?callbackUrl=${callbackUrl}`);
      }
    }
    return Promise.reject(error);
  },
);

export default realApi;
