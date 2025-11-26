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
    const { amount, currency, workspace_id, invoice_id, description } = body;

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

    // Create Payment Link using Stripe Payment Links API
    // Note: Payment Links metadata is passed to checkout sessions, which then pass to payment intents
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || `Invoice Payment`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      // Metadata will be passed to checkout session and then to payment intent
      metadata: {
        workspace_id,
        invoice_id: invoice_id || "",
        user_id: user.id,
      },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/payments?success=true&invoice_id=${invoice_id || ""}`,
        },
      },
    });

    return NextResponse.json({
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error: any) {
    console.error("Error creating payment link:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment link" },
      { status: 500 }
    );
  }
}
