# Stripe Integration Usage Guide

This guide explains how to use the Stripe integration for processing payments and managing invoices.

## Overview

The Stripe integration allows each workspace to:
- **Accept payments** for receivable invoices
- **Automatically sync** payment data from Stripe
- **Match payments** to invoices automatically
- **Track payment status** (pending, completed, refunded)

## Setup

### 1. Connect Stripe to Your Workspace

1. Go to **Settings** > **Integrations** tab
2. Click **"Connect Stripe"** button
3. Enter your Stripe API keys:
   - **Publishable Key**: From Stripe Dashboard > Developers > API keys (starts with `pk_test_` or `pk_live_`)
   - **Secret Key**: From the same page (starts with `sk_test_` or `sk_live_`)
   - **Webhook Secret** (optional): Get this after configuring webhook endpoint
4. Click **"Connect Stripe"**

### 2. Configure Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) > **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   - **Production**: `https://yourdomain.com/api/stripe/webhook`
   - **Development**: Use Stripe CLI (see below)
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.refunded`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Go back to Settings > Integrations and click **"Update Keys"** to add the webhook secret

### 3. Local Development Setup

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will display a webhook signing secret. Use this in your workspace integration settings.

## Using Stripe for Payments

### For Receivable Invoices (Money Coming In)

**Receivable invoices** are invoices you issue to customers. These can be paid via Stripe:

1. Navigate to an invoice with type **"Receivable"**
2. Click the **"Pay with Stripe"** button
3. Enter payment details in the secure Stripe payment form
4. Complete the payment
5. The payment is automatically:
   - Recorded in the Payments table
   - Matched to the invoice
   - Invoice status updated if fully paid

### Payment Flow

```
User clicks "Pay with Stripe"
    ↓
Payment Intent created (uses workspace Stripe keys)
    ↓
Stripe Elements form displayed
    ↓
User completes payment
    ↓
Stripe sends webhook to /api/stripe/webhook
    ↓
Payment record created in database
    ↓
Payment automatically matched to invoice (if invoice_id provided)
    ↓
Invoice status updated
```

## Using Stripe for Invoices

### Creating Receivable Invoices

1. **Upload Invoice**: Upload a customer invoice (PDF/image)
2. **AI Extraction**: Invoice data is automatically extracted
3. **Review & Approve**: Review the extracted data
4. **Invoice Type**: Ensure invoice type is set to **"Receivable"**
5. **Status**: Keep as **"Draft"** for receivable invoices
6. **Payment**: Customer can now pay via "Pay with Stripe" button

### Payment Matching

When a payment is received via Stripe:

1. **Webhook receives** `payment_intent.succeeded` event
2. **Payment record created** with:
   - Amount, fee, net amount
   - Currency
   - Customer information
   - Payment intent ID (external_id)
3. **Auto-matching**: If `invoice_id` is in payment intent metadata, payment is automatically matched
4. **Invoice status**: Updated to "paid" or "partially_paid" if applicable

## Payment Processing Features

### Automatic Fee Calculation

Stripe fees are automatically calculated:
- **Fee**: 2.9% + $0.30 per transaction
- **Net Amount**: Payment amount minus fees

### Payment Status Tracking

- **Pending**: Payment initiated but not completed
- **Completed**: Payment successfully processed
- **Refunded**: Payment was refunded
- **Disputed**: Payment is under dispute

### Payment Matching

Payments can be matched to invoices:
- **Automatic**: When `invoice_id` is provided in payment intent metadata
- **Manual**: Via the Payments page > Match Payment button

## API Endpoints

### Create Payment Intent
```
POST /api/stripe/create-payment-intent
Body: {
  amount: number,
  currency: string,
  workspace_id: string,
  invoice_id?: string,
  customer_email?: string,
  description?: string
}
```

### Webhook Handler
```
POST /api/stripe/webhook
Headers: {
  stripe-signature: string
}
Body: Raw webhook event from Stripe
```

## Workspace-Specific Configuration

Each workspace can have its own Stripe account:
- **Different Stripe accounts** per workspace
- **Isolated payment processing**
- **Workspace-specific webhook secrets**
- **Independent payment tracking**

## Security Notes

- **Secret keys** are stored encrypted in the database
- **Webhook signatures** are verified for security
- **Workspace isolation** ensures payments are processed with correct Stripe account
- **Never expose** secret keys in client-side code

## Troubleshooting

### Payment Intent Creation Fails

- Check if Stripe is connected for the workspace
- Verify Stripe keys are valid
- Ensure amount is greater than 0
- Check server logs for detailed errors

### Webhook Not Receiving Events

- Verify webhook endpoint URL in Stripe Dashboard
- Check webhook secret is configured correctly
- Ensure webhook events are enabled in Stripe Dashboard
- For local development, ensure Stripe CLI is running

### Payments Not Appearing

- Check webhook is receiving events (Stripe Dashboard > Webhooks)
- Verify `workspace_id` is in payment intent metadata
- Check webhook handler logs for errors
- Ensure database connection is working

### Payment Not Matched to Invoice

- Verify `invoice_id` is provided when creating payment intent
- Check invoice exists and belongs to the workspace
- Review payment match logs

## Best Practices

1. **Always provide `invoice_id`** when creating payment intents for automatic matching
2. **Use workspace-specific keys** for multi-tenant isolation
3. **Configure webhook secrets** for production security
4. **Monitor webhook events** in Stripe Dashboard
5. **Test with Stripe test cards** before going live
6. **Handle payment failures** gracefully in your UI

## Test Cards

Use these test card numbers in test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

