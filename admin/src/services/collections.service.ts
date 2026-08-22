import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";

export interface Collection {
  id: string;
  name: string;
  image?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const collectionsService = (api: AxiosInstance) => ({
  async getAll(): Promise<Collection[]> {
    const response = await api.get(API_ENDPOINTS.collections.all);
    return response.data;
  },

  async getById(id: string): Promise<Collection> {
    const response = await api.get(API_ENDPOINTS.collections.byId(id));
    return response.data;
  },

  async create(data: Partial<Collection>): Promise<Collection> {
    const response = await api.post(API_ENDPOINTS.collections.create, data);
    return response.data;
  },

  async createWithMedia(
    data: Partial<Collection> & { file?: File },
  ): Promise<Collection> {
    const formData = new FormData();

    if (data.name) formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    if (data.status) formData.append("status", data.status);

    if (data.file) {
      formData.append("file", data.file);
    }

    const response = await api.post(
      `${API_ENDPOINTS.collections.create}/create-with-media?mediaType=image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  async update(id: string, data: Partial<Collection>): Promise<Collection> {
    const response = await api.patch(
      API_ENDPOINTS.collections.update(id),
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.collections.delete(id));
  },
});
