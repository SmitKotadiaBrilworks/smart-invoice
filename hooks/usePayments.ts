import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { Payment, PaymentMatch } from "@/types";
import type {
  PaymentSource,
  PaymentStatus,
} from "@/lib/supabase/database.types";

export const usePayments = (
  workspaceId: string,
  filters?: {
    source?: PaymentSource;
    status?: PaymentStatus;
    date_from?: string;
    date_to?: string;
  }
) => {
  return useQuery({
    queryKey: ["payments", workspaceId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (filters?.source) params.append("source", filters.source);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.date_from) params.append("date_from", filters.date_from);
      if (filters?.date_to) params.append("date_to", filters.date_to);

      const { data } = await apiClient.get(`/payments?${params.toString()}`);
      return data.payments as Payment[];
    },
    enabled: !!workspaceId,
  });
};

export const useUnmatchedPayments = (workspaceId: string) => {
  return useQuery({
    queryKey: ["payments", "unmatched", workspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/payments/unmatched?workspace_id=${workspaceId}`
      );
      return data.payments as Payment[];
    },
    enabled: !!workspaceId,
  });
};

export const useMatchedPayments = (workspaceId: string) => {
  return useQuery({
    queryKey: ["payments", "matched", workspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/payments/matched?workspace_id=${workspaceId}`
      );
      return data.payments as Payment[];
    },
    enabled: !!workspaceId,
  });
};

export const usePaymentSuggestions = (
  paymentId: string,
  workspaceId: string
) => {
  return useQuery({
    queryKey: ["payments", "suggestions", paymentId, workspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/payments/${paymentId}/suggestions?workspace_id=${workspaceId}`
      );
      return data.suggestions as Array<{
        invoice: any;
        score: number;
        reason: string;
      }>;
    },
    enabled: !!paymentId && !!workspaceId,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspace_id: string;
      source: "stripe" | "manual";
      amount: number;
      currency: string;
      received_at: string;
      customer?: string;
      external_id?: string;
      fee?: number;
      net?: number;
      status?: PaymentStatus;
    }) => {
      const { data } = await apiClient.post("/payments", payload);
      return data.payment as Payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", variables.workspace_id],
      });
    },
  });
};

export const useCreatePaymentMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspace_id: string;
      invoice_id: string;
      payment_id: string;
      score?: number;
      method?: "auto" | "manual";
      reason?: string;
    }) => {
      const { data } = await apiClient.post("/payments/matches", payload);
      return data.match as PaymentMatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", variables.workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspace_id],
      });
    },
  });
};

export const useUpdatePaymentMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      match_id: string;
      workspace_id: string;
      invoice_id?: string;
      score?: number;
      reason?: string;
    }) => {
      const { match_id, workspace_id, ...updates } = payload;
      const { data } = await apiClient.patch(
        `/payments/matches/${match_id}?workspace_id=${workspace_id}`,
        updates
      );
      return data.match as PaymentMatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", variables.workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspace_id],
      });
    },
  });
};

export const useDeletePaymentMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { match_id: string; workspace_id: string }) => {
      const { match_id, workspace_id } = payload;
      await apiClient.delete(
        `/payments/matches/${match_id}?workspace_id=${workspace_id}`
      );
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", variables.workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspace_id],
      });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      payment_id: string;
      workspace_id: string;
    }) => {
      const { payment_id, workspace_id } = payload;
      await apiClient.delete(
        `/payments/${payment_id}?workspace_id=${workspace_id}`
      );
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", variables.workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", variables.workspace_id],
      });
    },
  });
};
