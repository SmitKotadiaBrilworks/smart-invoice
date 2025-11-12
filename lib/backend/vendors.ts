import { supabaseAdmin } from "@/lib/supabase/server";
import type { Vendor } from "@/types";

export const vendorBackend = {
  getVendors: async (workspaceId: string) => {
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Vendor[];
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
