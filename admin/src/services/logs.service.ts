import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";
import { ErrorLog, ErrorLogListResponse, ErrorLogQueryParams } from "@/types/log";

export const logsService = (api: AxiosInstance) => ({
  async getAll(params?: ErrorLogQueryParams): Promise<ErrorLogListResponse> {
    const response = await api.get(API_ENDPOINTS.logs.getAll, { params });
    return response.data;
  },

  async getById(id: string): Promise<ErrorLog> {
    const response = await api.get(API_ENDPOINTS.logs.getById(id));
    return response.data;
  },

  async updateStatus(id: string, status: "resolved" | "unresolved") {
    const response = await api.patch(API_ENDPOINTS.logs.updateStatus(id), {
      status,
    });
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(API_ENDPOINTS.logs.delete(id));
    return response.data;
  },

  async clear(body: { olderThanDays?: number; ids?: string[] }) {
    const response = await api.post(API_ENDPOINTS.logs.clear, body);
    return response.data;
  },

  // Uses the auth'd instance with responseType "blob" (not a bare
  // window.open) since the export endpoint is behind JwtAuthGuard and needs
  // the Authorization header.
  async exportCsv(
    params?: Omit<ErrorLogQueryParams, "skip" | "take">,
  ): Promise<Blob> {
    const response = await api.get(API_ENDPOINTS.logs.export, {
      params,
      responseType: "blob",
    });
    return response.data;
  },
});
