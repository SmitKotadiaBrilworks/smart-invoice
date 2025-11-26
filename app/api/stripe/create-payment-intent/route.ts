import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getWorkspaceStripeClient } from "@/lib/stripe/workspace-client";

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
    const {
      amount,
      currency,
      workspace_id,
      invoice_id,
      customer_email,
      description,
    } = body;

    if (!amount || !currency || !workspace_id) {
      return NextResponse.json(
        { error: "amount, currency, and workspace_id are required" },
        { status: 400 }
      );
    }

    // Validate amount (must be positive)
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get workspace-specific Stripe client
    const stripe = await getWorkspaceStripeClient(workspace_id);

    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe integration not configured for this workspace. Please configure it in Settings.",
        },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        workspace_id,
        invoice_id: invoice_id || "",
        user_id: user.id,
      },
      receipt_email: customer_email || undefined,
      description: description || `Payment for invoice ${invoice_id || ""}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
