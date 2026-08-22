import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/mock-auth";

interface UseAdminQueryOptions<T> extends Omit<
  UseQueryOptions<T, Error>,
  "queryKey" | "queryFn"
> {
  showErrorToast?: boolean;
}

export function useAdminQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: UseAdminQueryOptions<T>,
) {
  const {
    showErrorToast = true,
    enabled = true,
    ...restOptions
  } = options || {};
  const { status } = useSession();

  return useQuery<T, Error>({
    queryKey,
    queryFn,
    enabled: enabled && status === "authenticated",
    ...restOptions,
    meta: {
      onError: (error: Error) => {
        if (showErrorToast) {
          toast.error(`Failed to load ${queryKey[0]}`, {
            description: error.message,
          });
        }
      },
    },
  });
}
