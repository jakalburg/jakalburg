import { AxiosInstance } from "axios";

export interface Customer {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export const customersService = (api: AxiosInstance) => ({
  // Get all customers (returns array directly based on current usage in page)
  async getAll(): Promise<Customer[]> {
    const response = await api.get("/customers");
    return response.data;
  },

  // Get single customer
  async getById(id: string): Promise<Customer> {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
});
