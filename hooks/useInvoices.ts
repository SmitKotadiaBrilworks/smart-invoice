import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { Invoice, InvoiceExtraction } from "@/types";
import type { InvoiceStatus } from "@/lib/supabase/database.types";

export const useInvoices = (
  workspaceId: string,
  filters?: {
    status?: InvoiceStatus;
    vendor_id?: string;
    date_from?: string;
    date_to?: string;
  }
) => {
  return useQuery({
    queryKey: ["invoices", workspaceId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (filters?.status) params.append("status", filters.status);
      if (filters?.vendor_id) params.append("vendor_id", filters.vendor_id);
      if (filters?.date_from) params.append("date_from", filters.date_from);
      if (filters?.date_to) params.append("date_to", filters.date_to);

      const { data } = await apiClient.get(`/invoices?${params.toString()}`);
      return data.invoices as Invoice[];
    },
    enabled: !!workspaceId,
  });
};

export const useInvoice = (invoiceId: string, workspaceId: string) => {
  return useQuery({
    queryKey: ["invoice", invoiceId, workspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/invoices/${invoiceId}?workspace_id=${workspaceId}`
      );
      return data.invoice as Invoice;
    },
    enabled: !!invoiceId && !!workspaceId,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspace_id: string;
      extraction: InvoiceExtraction;
      vendor_id: string;
      source?: "upload" | "email";
      confidence?: number;
    }) => {
      const { data } = await apiClient.post("/invoices", payload);
      return data.invoice as Invoice;
    },
    onSuccess: (
      _: Invoice,
      variables: {
        workspace_id: string;
        extraction: InvoiceExtraction;
        vendor_id: string;
        source?: "upload" | "email";
        confidence?: number;
      }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspace_id],
      });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      invoiceId: string;
      workspaceId: string;
      updates: Partial<Invoice>;
    }) => {
      const { data } = await apiClient.patch(
        `/invoices/${payload.invoiceId}?workspace_id=${payload.workspaceId}`,
        payload.updates
      );
      return data.invoice as Invoice;
    },
    onSuccess: (
      _: Invoice,
      variables: {
        invoiceId: string;
        workspaceId: string;
        updates: Partial<Invoice>;
      }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["invoice", variables.invoiceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspaceId],
      });
    },
  });
};

export const useApproveInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { invoiceId: string; workspaceId: string }) => {
      const { data } = await apiClient.post(
        `/invoices/${payload.invoiceId}/approve?workspace_id=${payload.workspaceId}`
      );
      return data.invoice as Invoice;
    },
    onSuccess: (
      _: Invoice,
      variables: { invoiceId: string; workspaceId: string }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["invoice", variables.invoiceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspaceId],
      });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { invoiceId: string; workspaceId: string }) => {
      await apiClient.delete(
        `/invoices/${payload.invoiceId}?workspace_id=${payload.workspaceId}`
      );
    },
    onSuccess: (
      _: void,
      variables: { invoiceId: string; workspaceId: string }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["invoices", variables.workspaceId],
      });
    },
  });
};
