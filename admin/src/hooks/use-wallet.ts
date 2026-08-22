import { useAdminQuery } from "./use-admin-query";
import { walletService } from "@/services/wallet.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function useWalletUsers(search?: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["wallet-users", search || ""], () =>
    walletService(axiosAuth).searchUsers(search),
  );
}

export function useWalletDetail(userId?: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["wallet", userId || ""],
    () => walletService(axiosAuth).getWalletDetail(userId as string),
    { enabled: !!userId },
  );
}

export function useOrderFundingSources(orderId?: string, enabled = true) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["wallet-order-funding", orderId || ""],
    () => walletService(axiosAuth).getOrderFundingSources(orderId as string),
    { enabled: enabled && !!orderId },
  );
}

export function useReturnResolution(orderId?: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["return-resolution", orderId || ""],
    () => walletService(axiosAuth).getReturnResolution(orderId as string),
    { enabled: !!orderId },
  );
}

export function useCreditWallet() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({
      userId,
      points,
      reason,
      relatedOrderId,
    }: {
      userId: string;
      points: number;
      reason: string;
      relatedOrderId?: string;
    }) => walletService(axiosAuth).credit(userId, { points, reason, relatedOrderId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-users"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.userId] });
      toast.success("Points credited successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to credit points", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

export function useDebitWallet() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({
      userId,
      points,
      reason,
      relatedOrderId,
    }: {
      userId: string;
      points: number;
      reason: string;
      relatedOrderId?: string;
    }) => walletService(axiosAuth).debit(userId, { points, reason, relatedOrderId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-users"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.userId] });
      toast.success("Points deducted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to deduct points", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

export function useResolveWithWalletCredit() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({
      orderId,
      points,
      reason,
    }: {
      orderId: string;
      points: number;
      reason: string;
    }) => walletService(axiosAuth).resolveWithWalletCredit(orderId, { points, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["return-resolution", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Kay Wallet credit granted for this return");
    },
    onError: (error: any) => {
      toast.error("Failed to resolve return with wallet credit", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

export function useResolveWithRefundRecord() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({
      orderId,
      ...data
    }: {
      orderId: string;
      refundAmount: number;
      refundMethod: string;
      refundReference: string;
      refundProcessedDate: string;
      reason: string;
      proofUrl?: string;
    }) => walletService(axiosAuth).resolveWithRefundRecord(orderId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["return-resolution", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Refund recorded successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to record refund", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}
