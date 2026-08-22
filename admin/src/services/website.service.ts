import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";

export interface WebsiteHomeSection {
  id: string;
  type: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  data?: any;
}

export const websiteService = (api: AxiosInstance) => ({
  async getAllHomeSections(): Promise<WebsiteHomeSection[]> {
    const response = await api.get(API_ENDPOINTS.website.homeSections.all);
    return response.data;
  },

  async updateHomeSection(
    id: string,
    data: Partial<WebsiteHomeSection>,
  ): Promise<WebsiteHomeSection> {
    const response = await api.patch(
      API_ENDPOINTS.website.homeSections.update(id),
      data,
    );
    return response.data;
  },

  async seedHomeSections(): Promise<any> {
    const response = await api.post(API_ENDPOINTS.website.homeSections.seed);
    return response.data;
  },
});
