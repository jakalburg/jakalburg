export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    ME: "/auth/me",
  },
  PRODUCTS: {
    LIST: "/products",
    CREATE: "/products",
    GET: (id: string) => `/products/${id}`,
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
  },
  USERS: {
    LIST: "/users",
    GET: (id: string) => `/users/${id}`,
  },
};
