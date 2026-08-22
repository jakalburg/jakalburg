import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "./use-axios-auth";
import { toast } from "sonner";
import { useSession } from "@/lib/mock-auth";

interface Profile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

export function useProfile() {
  const axiosAuth = useAxiosAuth();
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        const response = await axiosAuth.get<{ user: { profiles: Profile[] } }>(
          "/profiles/me",
        );
        // Backend returns { user: { profiles: [...] } }, extract the first profile
        const profile = response.data?.user?.profiles?.[0] || null;
        return profile;
      } catch (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
    },
    // Only fetch when session is authenticated
    enabled: status === "authenticated" && !!session,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      try {
        const response = await axiosAuth.patch<{
          user: { profiles: Profile[] };
        }>("/profiles/me", data);
        // Backend returns { user: { profiles: [...] } }, extract the first profile
        const updatedProfile = response.data?.user?.profiles?.[0] || null;
        return updatedProfile;
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    onSuccess: (updatedProfile) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(["profile"], updatedProfile);
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile", {
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Unknown error occurred",
      });
    },
  });
}
