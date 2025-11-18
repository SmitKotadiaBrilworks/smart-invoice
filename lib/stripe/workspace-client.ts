import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Get Stripe client for a specific workspace
 * Uses workspace-specific Stripe keys from database
 */
export async function getWorkspaceStripeClient(
  workspaceId: string
): Promise<Stripe | null> {
  try {
    // Get Stripe integration for workspace
    // Use type assertion since workspace_integrations table is not in generated types yet
    const { data, error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .select("secret_key_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching Stripe integration:", error);
      return null;
    }

    if (!data || !data.secret_key_encrypted) {
      console.warn(
        `No active Stripe integration found for workspace ${workspaceId}`
      );
      return null;
    }

    // Create Stripe client with workspace-specific key
    const stripe = new Stripe(data.secret_key_encrypted, {
      apiVersion: "2025-10-29.clover",
      typescript: true,
    });

    return stripe;
  } catch (error) {
    console.error("Error creating workspace Stripe client:", error);
    return null;
  }
}

/**
 * Get Stripe publishable key for a workspace
 */
export async function getWorkspacePublishableKey(
  workspaceId: string
): Promise<string | null> {
  try {
    // Use type assertion since workspace_integrations table is not in generated types yet
    const { data, error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .select("publishable_key")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching Stripe publishable key:", error);
      return null;
    }

    return data?.publishable_key || null;
  } catch (error) {
    console.error("Error getting workspace publishable key:", error);
    return null;
  }
}
