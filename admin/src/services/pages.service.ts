import { AxiosInstance } from "axios";
import API_ENDPOINTS from "../config/endpoints";

export interface PageDto {
  id?: string;
  title: string;
  slug: string;
  content: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

export const pagesService = (api: AxiosInstance) => ({
  // Get all pages
  async getAll() {
    const response = await api.get(API_ENDPOINTS.pages.getAll);
    return response.data;
  },

  // Get single page by ID
  async getById(id: string) {
    const response = await api.get(API_ENDPOINTS.pages.getById(id));
    return response.data;
  },

  // Create page
  async create(data: PageDto) {
    const response = await api.post(API_ENDPOINTS.pages.create, data);
    return response.data;
  },

  // Update page
  async update(id: string, data: Partial<PageDto>) {
    const response = await api.patch(API_ENDPOINTS.pages.update(id), data);
    return response.data;
  },

  // Delete page
  async delete(id: string) {
    const response = await api.delete(API_ENDPOINTS.pages.delete(id));
    return response.data;
  },

  // Seed default pages
  async seed() {
    const response = await api.post(API_ENDPOINTS.pages.seed);
    return response.data;
  },
});
