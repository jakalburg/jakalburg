import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Customers service — wired to the real NestJS backend (like products /
// fabrics / admin-staff). Every call goes through `realApi`, NOT the mock axios
// the rest of the admin still uses; the injected instance is ignored on purpose.
//
// Backend: server `CustomersModule` (@Controller('customers')). A customer is a
// non-admin User; the list carries order-count + total-spend aggregates, and
// the detail embeds the customer's order history.
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  name?: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export const customersService = (_api: AxiosInstance) => ({
  // List all customers (returns array directly).
  async getAll(): Promise<Customer[]> {
    const response = await realApi.get("/customers");
    return response.data;
  },

  // One customer with embedded order history.
  async getById(id: string): Promise<Customer> {
    const response = await realApi.get(`/customers/${id}`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await realApi.delete(`/customers/${id}`);
  },
});
