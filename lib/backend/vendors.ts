import { supabaseAdmin } from "@/lib/supabase/server";
import type { Vendor } from "@/types";

export const vendorBackend = {
  getVendors: async (
    workspaceId: string,
    filters?: {
      page?: number;
      pageSize?: number;
    }
  ) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabaseAdmin
      .from("vendors")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true })
      .range(start, end);

    if (error) throw error;
    return { vendors: data as Vendor[], count: count || 0 };
  },

  getVendor: async (vendorId: string, workspaceId: string) => {
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  createVendor: async (
    workspaceId: string,
    vendorData: Omit<
      Vendor,
      "id" | "workspace_id" | "created_at" | "updated_at"
    >
  ) => {
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .insert({
        workspace_id: workspaceId,
        ...vendorData,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  updateVendor: async (
    vendorId: string,
    workspaceId: string,
    updates: Partial<Vendor>
  ) => {
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update(updates)
      .eq("id", vendorId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  deleteVendor: async (vendorId: string, workspaceId: string) => {
    const { error } = await supabaseAdmin
      .from("vendors")
      .delete()
      .eq("id", vendorId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return { success: true };
  },
};
