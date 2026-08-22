import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";

export const adminService = (api: AxiosInstance) => ({
  async getAll() {
    const response = await api.get(API_ENDPOINTS.admin.getAll);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post(API_ENDPOINTS.admin.create, data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.patch(API_ENDPOINTS.admin.update(id), data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(API_ENDPOINTS.admin.delete(id));
    return response.data;
  },
});
