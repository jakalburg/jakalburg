import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "./use-axios-auth";
import { realApi } from "@/lib/api/real-axios";
import { toast } from "sonner";

export interface WebsiteAboutData {
  id?: string;
  subtitle?: string;
  title?: string;
  description?: string;
  imageMain?: string;
  videoMain?: string;
  imageSub?: string;
  founderQuote?: string;
  founderText?: string;
  showcase?: any;
  strategy?: any;
  whyUs?: any;
}

export interface WebsiteContactData {
  id?: string;
  // Global store contact details (shown on the storefront /contact page).
  email?: string;
  phone?: string;
  address?: string;
  /** Google Maps URL — optional; the storefront links the address to it when set. */
  mapLink?: string;
  contactImage?: string;
  subtitle?: string;
  title?: string;
  formTitle?: string;
  formDescription?: string;
  needTodayTitle?: string;
  needTodayDescription?: string;
}

export function useGetAbout(options?: { enabled?: boolean }) {
  const axiosAuth = useAxiosAuth();

  return useQuery({
    queryKey: ["website-about"],
    queryFn: async () => {
      const { data } = await axiosAuth.get<WebsiteAboutData>("/website/about");
      return data;
    },
    enabled: options?.enabled,
  });
}

export function useUpdateAbout() {
  const axiosAuth = useAxiosAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteAboutData>) => {
      const res = await axiosAuth.patch("/website/about", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-about"] });
      toast.success("About page updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update about page",
      );
    },
  });
}

// Contact page content is wired to the REAL backend (server WebsiteContact
// singleton). GET is public; PATCH is admin-only — realApi attaches the admin JWT.
export function useGetContact(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["website-contact"],
    queryFn: async () => {
      const { data } =
        await realApi.get<WebsiteContactData>("/website/contact");
      return data;
    },
    enabled: options?.enabled,
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteContactData>) => {
      const res = await realApi.patch("/website/contact", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-contact"] });
      toast.success("Contact page updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update contact page",
      );
    },
  });
}
