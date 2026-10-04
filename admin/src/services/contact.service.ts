import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, toPaginated } from "@/types/pagination";

// ---------------------------------------------------------------------------
// Contact service — wired to the real NestJS backend (like customers / orders /
// fabrics). Every call goes through `realApi`, NOT the mock axios the rest of
// the admin still uses; the injected instance is ignored on purpose.
//
// Backend: server `ContactModule` (@Controller('contact')). Storefront forms
// POST submissions publicly; these admin reads/writes are @AdminOnly(). One
// table, discriminated by `type`: "contact_us" | "newsletter".
// ---------------------------------------------------------------------------

export type ContactType = "contact_us" | "newsletter";
export type ContactStatus = "unread" | "read";

export interface Contact {
  id: string;
  name: string | null;
  email: string;
  subject?: string | null;
  message: string | null;
  type: ContactType;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export const contactService = (_api: AxiosInstance) => ({
  /**
   * ONE page of an inbox (10 by default), newest-first. This table grows with
   * every form submission, so the screen asks for the page it's showing rather
   * than the whole history.
   */
  async getAll(
    type: ContactType,
    params?: { page?: number; limit?: number },
  ): Promise<Paginated<Contact>> {
    const response = await realApi.get("/contact", {
      params: { type, page: params?.page, limit: params?.limit },
    });
    return toPaginated<Contact>(response.data, params?.limit);
  },

  /** Mark a submission read / unread. */
  async updateStatus(id: string, status: ContactStatus): Promise<Contact> {
    const response = await realApi.patch(`/contact/${id}/status`, { status });
    return response.data as Contact;
  },

  /** Permanently delete a submission. */
  async remove(id: string): Promise<void> {
    await realApi.delete(`/contact/${id}`);
  },
});
