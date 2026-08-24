import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Admin (staff) service — wired to the real NestJS backend (like products /
// fabrics). Every call goes through `realApi`, NOT the mock axios the rest of
// the admin still uses. Call sites keep passing the mock instance from
// `useAxiosAuth()` for signature compatibility, but it is ignored on purpose.
//
// Backend: server `AdminModule` — routes under /admin/staff. An admin is a User
// row with role = "admin"; created accounts are email-verified so they can sign
// in immediately via /auth/login-password.
// ---------------------------------------------------------------------------

export const adminService = (_api: AxiosInstance) => ({
  async getAll() {
    const response = await realApi.get(API_ENDPOINTS.admin.getAll);
    return response.data;
  },

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const response = await realApi.post(API_ENDPOINTS.admin.create, data);
    return response.data;
  },

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    },
  ) {
    const response = await realApi.patch(API_ENDPOINTS.admin.update(id), data);
    return response.data;
  },

  async delete(id: string) {
    const response = await realApi.delete(API_ENDPOINTS.admin.delete(id));
    return response.data;
  },
});
