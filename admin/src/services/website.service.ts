import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

// ---------------------------------------------------------------------------
// Website (home sections) service — wired to the real NestJS backend (like
// products / fabrics / admin-staff / customers / orders). Every call goes
// through `realApi`; the injected mock axios is ignored on purpose.
//
// Backend: server `WebsiteController` (@Controller('website/home-sections')).
// Sections are persisted in the `HomeSection` table; each carries a `data` Json
// blob (HeroSlider → the array of hero slides the storefront renders).
// ---------------------------------------------------------------------------

export interface WebsiteHomeSection {
  id: string;
  type: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  gridBg?: boolean;
  paddingTop?: boolean;
  paddingBottom?: boolean;
  fullBleed?: boolean;
  data?: any;
}

export const websiteService = (_api: AxiosInstance) => ({
  async getAllHomeSections(): Promise<WebsiteHomeSection[]> {
    const response = await realApi.get(API_ENDPOINTS.website.homeSections.all);
    return response.data;
  },

  async updateHomeSection(
    id: string,
    data: Partial<WebsiteHomeSection>,
  ): Promise<WebsiteHomeSection> {
    const response = await realApi.patch(
      API_ENDPOINTS.website.homeSections.update(id),
      data,
    );
    return response.data;
  },

  async seedHomeSections(): Promise<any> {
    const response = await realApi.post(
      API_ENDPOINTS.website.homeSections.seed,
    );
    return response.data;
  },
});
