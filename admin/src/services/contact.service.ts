import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";

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
  /** One inbox: every submission of a given `type`, newest-first. */
  async getAll(type: ContactType): Promise<Contact[]> {
    const response = await realApi.get("/contact", { params: { type } });
    return response.data as Contact[];
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
