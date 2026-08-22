import { AxiosInstance } from "axios";

export interface Category {
  id: string;
  parent: string;
  parentId?: string | null;
  img?: string;
  productType?: string;
  description?: string;
  status?: string;
  subCategories?: Category[];
  createdAt?: string;
  updatedAt?: string;
}

export const categoriesService = (api: AxiosInstance) => ({
  // Get all categories
  async getAll(): Promise<Category[]> {
    const response = await api.get("/categories");
    return response.data;
  },

  // Get single category
  async getById(id: string): Promise<Category> {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Create category
  async create(data: Partial<Category>): Promise<Category> {
    const response = await api.post("/categories", data);
    return response.data;
  },

  // Create category with image file
  async createWithMedia(
    data: Partial<Category> & { file?: File },
  ): Promise<Category> {
    const formData = new FormData();

    // Append category fields
    if (data.parent) formData.append("parent", data.parent);
    if (data.parentId) formData.append("parentId", data.parentId);
    if (data.productType) formData.append("productType", data.productType);
    if (data.description) formData.append("description", data.description);
    if (data.status) formData.append("status", data.status);

    // Append image file if present
    if (data.file) {
      formData.append("file", data.file);
    }

    const response = await api.post(
      "/categories/create-with-media?mediaType=image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Update category
  async update(id: string, data: Partial<Category>): Promise<Category> {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
});
