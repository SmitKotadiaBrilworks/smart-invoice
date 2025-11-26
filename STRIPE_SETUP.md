# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for your Smart Invoice application.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your Stripe API keys (available in your Stripe Dashboard)

## Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Getting Your Stripe Keys

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** > **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
4. Copy your **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for live mode)

## Webhook Setup

Stripe webhooks are essential for processing payments securely. They notify your application when payment events occur.

### Setting Up Webhooks in Stripe Dashboard

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** > **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL:
   - **Development**: `http://localhost:3000/api/stripe/webhook` (use Stripe CLI - see below)
   - **Production**: `https://yourdomain.com/api/stripe/webhook`
5. Select the following events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.refunded`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`) and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Testing Webhooks Locally with Stripe CLI

For local development, use the Stripe CLI to forward webhooks to your local server:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to Stripe:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. The CLI will display a webhook signing secret (starts with `whsec_`). Use this in your `.env.local` for local development.

## Features

### Payment Processing

- **Create Payment Intents**: Generate secure payment intents for customer payments
- **Stripe Elements**: Secure payment form using Stripe's pre-built UI components
- **Automatic Payment Matching**: Payments are automatically matched to invoices when webhooks are received

### Supported Payment Methods

Stripe supports various payment methods including:

- Credit and debit cards
- Digital wallets (Apple Pay, Google Pay)
- Bank transfers (depending on your region)
- And more (configured in your Stripe Dashboard)

## Usage

### For Receivable Invoices

1. Navigate to an invoice with type "Receivable"
2. Click the **"Pay with Stripe"** button
3. Enter payment details in the secure Stripe payment form
4. Complete the payment
5. The payment will be automatically recorded and matched to the invoice via webhook

### Payment Flow

1. User clicks "Pay with Stripe" on a receivable invoice
2. Frontend creates a payment intent via `/api/stripe/create-payment-intent`
3. Stripe Elements form is displayed with secure payment fields
4. User completes payment
5. Stripe sends webhook to `/api/stripe/webhook`
6. Webhook handler:
   - Creates payment record in database
   - Automatically matches payment to invoice (if invoice_id provided)
   - Updates invoice status if fully paid

## Security Notes

- **Never expose your secret key** in client-side code
- Always use environment variables for sensitive keys
- Verify webhook signatures in production (handled automatically)
- Use HTTPS in production
- Regularly rotate your API keys

## Testing

### Test Cards

Use these test card numbers in test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### Test Mode vs Live Mode

- **Test Mode**: Use `sk_test_` and `pk_test_` keys for development
- **Live Mode**: Use `sk_live_` and `pk_live_` keys for production

Switch between modes in your Stripe Dashboard.

## Troubleshooting

### Webhook Not Receiving Events

1. Check that your webhook endpoint URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check Stripe Dashboard > Webhooks for delivery logs
4. For local development, ensure Stripe CLI is running

### Payment Intent Creation Fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check that the amount is greater than 0
3. Ensure currency code is valid (3-letter ISO code)
4. Check server logs for detailed error messages

### Payments Not Appearing in Database

1. Verify webhook is receiving events (check Stripe Dashboard)
2. Check webhook handler logs for errors
3. Ensure `workspace_id` is included in payment intent metadata
4. Verify database connection and permissions

## API Routes

- `POST /api/stripe/create-payment-intent` - Create a new payment intent
- `POST /api/stripe/webhook` - Handle Stripe webhook events

## Support

For Stripe-specific issues, refer to:

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
