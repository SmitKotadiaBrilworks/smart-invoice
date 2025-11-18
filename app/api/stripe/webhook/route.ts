import { NextRequest, NextResponse } from "next/server";
import { paymentBackend } from "@/lib/backend/payments";
import { getWorkspaceStripeClient } from "@/lib/stripe/workspace-client";
import { headers } from "next/headers";
import Stripe from "stripe";

// Disable body parsing for webhook route - Stripe needs raw body
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Try to get webhook secret from environment first (for backward compatibility)
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If no env secret, try to extract workspace_id from event to get workspace-specific secret
  // We'll parse the event first to get workspace_id
  let event: Stripe.Event;
  let parsedEvent: any;

  try {
    // Parse event to get workspace_id (without verification first)
    parsedEvent = JSON.parse(body);
    event = parsedEvent as Stripe.Event;
  } catch (parseErr) {
    console.error("Failed to parse webhook body:", parseErr);
    return NextResponse.json(
      { error: "Invalid webhook body" },
      { status: 400 }
    );
  }

  // Try to get workspace-specific webhook secret
  const workspaceId =
    (event.data.object as any)?.metadata?.workspace_id ||
    (event.data.object as any)?.payment_intent?.metadata?.workspace_id;

  if (workspaceId && !webhookSecret) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase/server");
      // Use type assertion since workspace_integrations table is not in generated types yet
      const { data: integration } = await (supabaseAdmin as any)
        .from("workspace_integrations")
        .select("webhook_secret")
        .eq("workspace_id", workspaceId)
        .eq("provider", "stripe")
        .eq("is_active", true)
        .maybeSingle();

      if (integration?.webhook_secret) {
        webhookSecret = integration.webhook_secret;
      }
    } catch (err) {
      console.warn("Could not fetch workspace webhook secret:", err);
    }
  }

  if (!webhookSecret) {
    console.warn(
      "STRIPE_WEBHOOK_SECRET is not set. Webhook verification skipped."
    );
    // In development, allow unverified events
    // In production, this should be required
  } else {
    // Verify webhook signature
    try {
      const { stripe } = await import("@/lib/stripe/client");
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
  }

  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeSucceeded(charge);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const { workspace_id, invoice_id } = paymentIntent.metadata;

  if (!workspace_id) {
    console.error("Missing workspace_id in payment intent metadata");
    return;
  }

  // Check if payment already exists
  const existingPayments = await paymentBackend.getPayments(workspace_id, {
    source: "stripe",
  });

  const existingPayment = existingPayments.find(
    (p) => p.external_id === paymentIntent.id
  );

  if (existingPayment) {
    console.log(`Payment ${paymentIntent.id} already exists in database`);
    return;
  }

  // Calculate fees (Stripe charges 2.9% + $0.30 per transaction)
  const amount = paymentIntent.amount / 100; // Convert from cents
  const fee = amount * 0.029 + 0.3; // 2.9% + $0.30
  const net = amount - fee;

  // Create payment record
  const payment = await paymentBackend.createPayment(workspace_id, {
    source: "stripe",
    external_id: paymentIntent.id,
    customer:
      (paymentIntent.customer as string) ||
      paymentIntent.receipt_email ||
      undefined,
    amount,
    fee,
    net,
    currency: paymentIntent.currency.toUpperCase(),
    received_at: new Date(paymentIntent.created * 1000).toISOString(),
    status: "completed",
    raw: paymentIntent as any,
  });

  console.log(`Created payment record for payment intent ${paymentIntent.id}`);

  // If invoice_id is provided, try to auto-match the payment
  if (invoice_id && payment.id) {
    try {
      await paymentBackend.createMatch(
        workspace_id,
        invoice_id,
        payment.id,
        1.0, // Perfect match score
        "auto",
        "Auto-matched from Stripe payment intent"
      );
      console.log(
        `Auto-matched payment ${payment.id} to invoice ${invoice_id}`
      );
    } catch (matchError) {
      console.error("Error auto-matching payment to invoice:", matchError);
      // Don't fail the webhook if matching fails
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { workspace_id } = paymentIntent.metadata;

  if (!workspace_id) {
    console.error("Missing workspace_id in payment intent metadata");
    return;
  }

  // Check if payment already exists
  const existingPayments = await paymentBackend.getPayments(workspace_id, {
    source: "stripe",
  });

  const existingPayment = existingPayments.find(
    (p) => p.external_id === paymentIntent.id
  );

  if (existingPayment) {
    // Update existing payment status
    await paymentBackend.updatePayment(existingPayment.id, workspace_id, {
      status: "pending",
    });
    console.log(`Updated payment ${paymentIntent.id} status to pending`);
    return;
  }

  // Create a pending/failed payment record for tracking
  const amount = paymentIntent.amount / 100;
  const fee = 0; // No fee if payment failed
  const net = 0;

  await paymentBackend.createPayment(workspace_id, {
    source: "stripe",
    external_id: paymentIntent.id,
    customer:
      (paymentIntent.customer as string) ||
      paymentIntent.receipt_email ||
      undefined,
    amount,
    fee,
    net,
    currency: paymentIntent.currency.toUpperCase(),
    received_at: new Date(paymentIntent.created * 1000).toISOString(),
    status: "pending", // Or you might want a "failed" status
    raw: paymentIntent as any,
  });

  console.log(
    `Created failed payment record for payment intent ${paymentIntent.id}`
  );
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  // Charges are handled via payment_intent.succeeded, but we can use this for additional processing
  console.log(`Charge succeeded: ${charge.id}`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error("Missing payment_intent in charge");
    return;
  }

  // Get workspace-specific Stripe client to retrieve payment intent
  // First, we need to find the workspace_id from existing payment
  // Since we don't have workspace_id in charge metadata, we'll search payments
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  // Use type assertion for workspace_integrations table
  const { data: paymentData } = await (supabaseAdmin as any)
    .from("payments")
    .select("workspace_id")
    .eq("external_id", paymentIntentId)
    .eq("source", "stripe")
    .maybeSingle();

  if (!paymentData?.workspace_id) {
    console.error(
      "Could not find workspace for payment intent:",
      paymentIntentId
    );
    return;
  }

  const workspaceStripe = await getWorkspaceStripeClient(
    paymentData.workspace_id
  );
  if (!workspaceStripe) {
    console.error(
      "No Stripe client found for workspace:",
      paymentData.workspace_id
    );
    return;
  }

  // Get the payment intent to verify
  const paymentIntent = await workspaceStripe.paymentIntents.retrieve(
    paymentIntentId
  );
  const { workspace_id } = paymentIntent.metadata;

  if (!workspace_id) {
    console.error("Missing workspace_id in payment intent metadata");
    return;
  }

  // Find the payment record
  const existingPayments = await paymentBackend.getPayments(workspace_id, {
    source: "stripe",
  });

  const existingPayment = existingPayments.find(
    (p) => p.external_id === paymentIntentId
  );

  if (existingPayment) {
    // Update payment status to refunded
    await paymentBackend.updatePayment(existingPayment.id, workspace_id, {
      status: "refunded",
    });
    console.log(`Updated payment ${paymentIntentId} status to refunded`);
  }
}
