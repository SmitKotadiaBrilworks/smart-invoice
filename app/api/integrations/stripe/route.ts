import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    // Get Stripe integration for workspace
    // Use type assertion since workspace_integrations table is not in generated types yet
    const { data, error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .select(
        "id, provider, publishable_key, webhook_secret, is_active, metadata, created_at, updated_at"
      )
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (error) throw error;

    // Don't return secret_key for security (but webhook_secret is safe to return)
    return NextResponse.json({
      integration: data || null,
      connected: !!data && data.is_active,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspace_id, publishable_key, secret_key, webhook_secret } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    // Check if integration already exists (for updates)
    const { data: existingIntegration } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .select("secret_key_encrypted")
      .eq("workspace_id", workspace_id)
      .eq("provider", "stripe")
      .maybeSingle();

    const isUpdate = !!existingIntegration;

    // For new connections, both keys are required
    // For updates, keys are optional (only update fields that are provided)
    if (!isUpdate) {
      if (!publishable_key || !secret_key) {
        return NextResponse.json(
          {
            error:
              "publishable_key and secret_key are required for new connections",
          },
          { status: 400 }
        );
      }
    } else {
      // For updates, at least one field must be provided
      if (!publishable_key && !secret_key && webhook_secret === undefined) {
        return NextResponse.json(
          { error: "At least one field must be provided for update" },
          { status: 400 }
        );
      }
    }

    if (publishable_key && !publishable_key.startsWith("pk_")) {
      return NextResponse.json(
        { error: "Invalid publishable key format" },
        { status: 400 }
      );
    }

    if (secret_key && !secret_key.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Invalid secret key format" },
        { status: 400 }
      );
    }

    // Test the keys if provided (for new connections or when updating secret_key)
    if (secret_key) {
      try {
        const Stripe = (await import("stripe")).default;
        const testStripe = new Stripe(secret_key, {
          apiVersion: "2025-10-29.clover",
        });
        // Try to retrieve account to verify key works
        await testStripe.accounts.retrieve();
      } catch (stripeError: any) {
        return NextResponse.json(
          { error: `Invalid Stripe keys: ${stripeError.message}` },
          { status: 400 }
        );
      }
    }

    // Upsert integration (insert or update)
    // Use type assertion since workspace_integrations table is not in generated types yet
    const updateData: any = {
      workspace_id,
      provider: "stripe",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (publishable_key) {
      updateData.publishable_key = publishable_key;
    }
    if (secret_key) {
      updateData.secret_key_encrypted = secret_key; // In production, encrypt this
    }
    if (webhook_secret !== undefined) {
      updateData.webhook_secret = webhook_secret || null;
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .upsert(updateData, {
        onConflict: "workspace_id,provider",
      })
      .select(
        "id, provider, publishable_key, is_active, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      integration: data,
      message: "Stripe integration connected successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    // Delete Stripe integration
    // Use type assertion since workspace_integrations table is not in generated types yet
    const { error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe");

    if (error) throw error;

    return NextResponse.json({
      message: "Stripe integration disconnected successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
