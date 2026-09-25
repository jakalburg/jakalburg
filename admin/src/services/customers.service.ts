import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, toPaginated } from "@/types/pagination";

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
  // One page of customers. Search and sort are applied in the database.
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    /** 'name' matches `search` against the display name only (author picker). */
    searchBy?: "name";
  }): Promise<Paginated<Customer>> {
    const response = await realApi.get("/customers", { params });
    return toPaginated<Customer>(response.data);
  },

  // One customer with a page of their order history. The embedded `orders`
  // array is paged server-side (10 by default) while `totalOrders` always
  // covers the full history, so the caller can page through it.
  async getById(
    id: string,
    params?: { page?: number; limit?: number },
  ): Promise<Customer> {
    const response = await realApi.get(`/customers/${id}`, { params });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await realApi.delete(`/customers/${id}`);
  },
});
