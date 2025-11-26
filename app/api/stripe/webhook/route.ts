import { NextRequest, NextResponse } from "next/server";
import { paymentBackend } from "@/lib/backend/payments";
import { getWorkspaceStripeClient } from "@/lib/stripe/workspace-client";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeFixedFeeInCurrency } from "@/lib/utils/currency-conversion";

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
  // Check multiple places for workspace_id (payment intent, checkout session, charge)
  // This is critical for identifying which workspace the payment belongs to
  const workspaceId =
    (event.data.object as any)?.metadata?.workspace_id ||
    (event.data.object as any)?.payment_intent?.metadata?.workspace_id ||
    (event.data.object as any)?.client_reference_id;

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

      case "payment_intent.created": {
        // Payment intent created - just log it, don't process yet
        // We'll process when payment_intent.succeeded fires
        // Note: For Payment Links, metadata might not be set yet at creation time
        // It will be set when checkout.session.completed fires
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { workspace_id } = paymentIntent.metadata || {};
        if (workspace_id) {
          console.log(
            `Payment intent created: ${paymentIntent.id} for workspace ${workspace_id}`
          );
        } else {
          // This is normal for Payment Links - metadata will be added later
          console.log(
            `Payment intent created: ${paymentIntent.id} (metadata will be set from checkout session)`
          );
        }
        break;
      }

      case "checkout.session.completed": {
        // Payment Links create checkout sessions
        // CRITICAL: Extract metadata and ensure it's passed to payment intent
        const session = event.data.object as Stripe.Checkout.Session;
        const { workspace_id, invoice_id } = (session.metadata || {}) as {
          workspace_id?: string;
          invoice_id?: string;
        };

        if (!workspace_id) {
          console.error(
            `CRITICAL: Checkout session ${session.id} missing workspace_id in metadata. Cannot process payment.`
          );
          console.error(
            "Session Metadata:",
            JSON.stringify(session.metadata, null, 2)
          );
          break;
        }

        if (session.payment_intent) {
          // ALWAYS update payment intent metadata to ensure workspace_id is present
          // This is critical for payment processing
          try {
            const stripe = await getWorkspaceStripeClient(workspace_id);
            if (stripe && typeof session.payment_intent === "string") {
              const paymentIntent = await stripe.paymentIntents.retrieve(
                session.payment_intent
              );

              // Update metadata to ensure workspace_id is always present
              const updatedMetadata = {
                workspace_id,
                invoice_id:
                  invoice_id || paymentIntent.metadata?.invoice_id || "",
                user_id: paymentIntent.metadata?.user_id || "",
                ...paymentIntent.metadata,
              };

              // Always update to ensure workspace_id is set
              await stripe.paymentIntents.update(session.payment_intent, {
                metadata: updatedMetadata,
              });
              console.log(
                `✅ Updated payment intent ${session.payment_intent} metadata with workspace_id: ${workspace_id}`
              );
            }
          } catch (updateError) {
            console.error(
              `CRITICAL: Error updating payment intent ${session.payment_intent} metadata:`,
              updateError
            );
            // Don't break - let payment_intent.succeeded try to handle it
          }
        } else {
          console.warn(
            `Checkout session ${session.id} has no payment_intent. This might be a subscription or other payment type.`
          );
        }
        console.log(
          `Checkout session completed: ${session.id} for workspace ${workspace_id}`
        );
        // Payment will be handled by payment_intent.succeeded event
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
  // CRITICAL: workspace_id is required to identify which workspace/user to add payment to
  // It should be set in metadata by checkout.session.completed handler for Payment Links
  // or directly in payment intent metadata for direct Payment Intents
  const workspace_id = paymentIntent.metadata?.workspace_id;
  const invoice_id = paymentIntent.metadata?.invoice_id;

  if (!workspace_id) {
    console.error(
      `CRITICAL: Missing workspace_id in payment intent ${paymentIntent.id}. Cannot process payment.`
    );
    console.error(
      "Payment Intent Metadata:",
      JSON.stringify(paymentIntent.metadata, null, 2)
    );
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
  // Convert the fixed fee from USD to the payment currency
  const amount = paymentIntent.amount / 100; // Convert from cents
  const currency = paymentIntent.currency.toUpperCase();
  const fixedFee = await getStripeFixedFeeInCurrency(currency); // Convert $0.30 to payment currency
  const fee = amount * 0.029 + fixedFee; // 2.9% + fixed fee in payment currency
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
    currency,
    received_at: new Date(paymentIntent.created * 1000).toISOString(),
    status: "completed",
    raw: paymentIntent as any,
  });

  console.log(`Created payment record for payment intent ${paymentIntent.id}`);

  // If invoice_id is provided, get invoice to determine payment direction
  let paymentDirection: "received" | "paid" = "received";
  if (invoice_id) {
    try {
      const { invoiceBackend } = await import("@/lib/backend/invoices");
      const invoice = await invoiceBackend.getInvoice(invoice_id, workspace_id);
      // Set direction based on invoice type
      paymentDirection =
        invoice.invoice_type === "payable" ? "paid" : "received";

      // Update payment with direction
      await paymentBackend.updatePayment(payment.id, workspace_id, {
        payment_direction: paymentDirection,
      });
    } catch (invoiceError) {
      console.error(
        "Error fetching invoice for payment direction:",
        invoiceError
      );
    }

    // Try to auto-match the payment
    try {
      await paymentBackend.createMatch(
        workspace_id,
        invoice_id,
        payment.id,
        1.0, // Perfect match score
        "auto",
        "Paid via Stripe - Auto-matched from payment intent"
      );
      console.log(
        `Auto-matched payment ${payment.id} to invoice ${invoice_id} and updated invoice status`
      );
    } catch (matchError) {
      console.error("Error auto-matching payment to invoice:", matchError);
      // Don't fail the webhook if matching fails
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { workspace_id } = paymentIntent.metadata || {};

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
  const { workspace_id } = paymentIntent.metadata || {};

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
