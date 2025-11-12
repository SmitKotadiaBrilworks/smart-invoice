import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Vendor } from "@/types";

export const useVendors = (workspaceId: string) => {
  return useQuery({
    queryKey: ["vendors", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Vendor[];
    },
    enabled: !!workspaceId,
  });
};

export const useVendor = (vendorId: string, workspaceId: string) => {
  return useQuery({
    queryKey: ["vendor", vendorId, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .eq("workspace_id", workspaceId)
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!vendorId && !!workspaceId,
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspace_id: string;
      name: string;
      tax_id?: string;
      default_category?: string;
      terms?: string;
      contact_email?: string;
      contact_phone?: string;
    }) => {
      const { data, error } = await supabase
        .from("vendors")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vendors", variables.workspace_id],
      });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      vendorId: string;
      workspaceId: string;
      updates: Partial<Vendor>;
    }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update(payload.updates)
        .eq("id", payload.vendorId)
        .eq("workspace_id", payload.workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vendor", variables.vendorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["vendors", variables.workspaceId],
      });
    },
  });
};
