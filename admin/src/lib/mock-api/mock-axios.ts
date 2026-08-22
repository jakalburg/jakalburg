// ---------------------------------------------------------------------------
// Mock axios instance for the UI-only admin build.
//
// Implements the subset of the axios `AxiosInstance` surface the admin code
// actually uses (get/post/patch/put/delete/request, interceptors, defaults) and
// routes every request through `resolveMock` instead of the network. Returned
// objects mimic an `AxiosResponse` ({ data, status, statusText, headers,
// config }) so `response.data` reads work unchanged.
//
// Swap this for a real `axios.create(...)` in `use-axios-auth` to reconnect a
// backend later — service/hook/component call sites do not change.
// ---------------------------------------------------------------------------

import type { AxiosInstance } from "axios";
import { resolveMock, type MockContext } from "./router";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

const LATENCY_MS = 120; // small delay so loading states are briefly visible

function makeResponse(data: any, config: any) {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config: config || {},
    request: {},
  };
}

function dispatch(method: Method, url: string, config: any): Promise<any> {
  const ctx: MockContext = {
    params: config?.params,
    data: config?.data,
    responseType: config?.responseType,
  };
  return new Promise((resolve) => {
    const data = resolveMock(method, url, ctx);
    setTimeout(() => resolve(makeResponse(data, { ...config, url, method })), LATENCY_MS);
  });
}

function noopInterceptor() {
  return {
    use: (_onFulfilled?: any, _onRejected?: any) => 0,
    eject: (_id: number) => {},
    clear: () => {},
  };
}

export function createMockAxios(): AxiosInstance {
  const instance: any = {
    defaults: {
      baseURL: "/mock-api",
      headers: { common: {}, get: {}, post: {}, patch: {}, put: {}, delete: {} },
      withCredentials: false,
    },
    interceptors: {
      request: noopInterceptor(),
      response: noopInterceptor(),
    },

    get: (url: string, config?: any) => dispatch("GET", url, config),
    delete: (url: string, config?: any) => dispatch("DELETE", url, config),
    head: (url: string, config?: any) => dispatch("GET", url, config),
    options: (url: string, config?: any) => dispatch("GET", url, config),

    post: (url: string, data?: any, config?: any) =>
      dispatch("POST", url, { ...(config || {}), data }),
    put: (url: string, data?: any, config?: any) =>
      dispatch("PUT", url, { ...(config || {}), data }),
    patch: (url: string, data?: any, config?: any) =>
      dispatch("PATCH", url, { ...(config || {}), data }),

    request: (config: any = {}) => {
      const method = String(config.method || "get").toUpperCase() as Method;
      return dispatch(method, config.url || "/", config);
    },

    getUri: (config: any = {}) => config.url || "/",
  };

  // Allow `mockAxios(config)` call style just in case.
  const callable: any = (config: any) => instance.request(config);
  Object.assign(callable, instance);

  return callable as AxiosInstance;
}

// A shared singleton is fine — the mock holds no per-request auth state.
export const mockAxios = createMockAxios();
