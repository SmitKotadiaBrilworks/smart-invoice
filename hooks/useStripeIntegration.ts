import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

export interface StripeIntegration {
  id: string;
  provider: string;
  publishable_key: string | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface StripeIntegrationResponse {
  integration: StripeIntegration | null;
  connected: boolean;
}

export interface ConnectStripePayload {
  workspace_id: string;
  publishable_key: string;
  secret_key: string;
  webhook_secret?: string;
}

export const useStripeIntegration = (workspaceId: string) => {
  return useQuery({
    queryKey: ["stripe-integration", workspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get<StripeIntegrationResponse>(
        `/integrations/stripe?workspace_id=${workspaceId}`
      );
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useConnectStripe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConnectStripePayload) => {
      const { data } = await apiClient.post<{
        integration: StripeIntegration;
        message: string;
      }>("/integrations/stripe", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["stripe-integration", variables.workspace_id],
      });
    },
  });
};

export const useDisconnectStripe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await apiClient.delete(
        `/integrations/stripe?workspace_id=${workspaceId}`
      );
    },
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({
        queryKey: ["stripe-integration", workspaceId],
      });
    },
  });
};
