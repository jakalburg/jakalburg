import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const brandsService = (api: AxiosInstance) => ({
  async getAll(): Promise<Brand[]> {
    const response = await api.get(API_ENDPOINTS.brands.all);
    return response.data;
  },

  async getById(id: string): Promise<Brand> {
    const response = await api.get(API_ENDPOINTS.brands.byId(id));
    return response.data;
  },

  async create(data: Partial<Brand>): Promise<Brand> {
    const response = await api.post(API_ENDPOINTS.brands.create, data);
    return response.data;
  },

  async createWithMedia(
    data: Partial<Brand> & { file?: File },
  ): Promise<Brand> {
    const formData = new FormData();

    if (data.name) formData.append("name", data.name);
    if (data.website) formData.append("website", data.website);
    if (data.description) formData.append("description", data.description);
    if (data.status) formData.append("status", data.status);

    if (data.file) {
      formData.append("file", data.file);
    }

    const response = await api.post(
      `${API_ENDPOINTS.brands.create}/create-with-media?mediaType=image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  async update(id: string, data: Partial<Brand>): Promise<Brand> {
    const response = await api.put(API_ENDPOINTS.brands.update(id), data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.brands.delete(id));
  },
});
