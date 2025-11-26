# Stripe Payment Flow Explanation

## Current Implementation

### How Stripe Works in Your System

**Your Stripe Account:**

- Connected to your workspace via API keys
- Used to **receive payments** from customers
- Money goes into **your Stripe account** → then to your connected bank account

### For Receivable Invoices (Money Coming In) ✅

**Flow:**

1. Customer clicks "Pay with Stripe" on a receivable invoice
2. Payment Intent created using **your Stripe account**
3. Customer enters their payment details
4. Money is charged to **customer's card**
5. Money goes to **your Stripe account**
6. Webhook triggers → Payment recorded in database
7. Invoice status updated to "paid"

**This works correctly** because:

- Customer pays you
- Money comes into your account
- Webhook tracks the incoming payment

### For Payable Invoices (Money Going Out) ❌

**Current Issue:**
The "Pay with Stripe" button for payable invoices doesn't work correctly because:

- It uses the same Payment Intent flow (designed to receive money)
- It would charge **your own card** to pay yourself
- It doesn't send money to vendors

**What Actually Happens:**

- If you click "Pay with Stripe" on a payable invoice, it would:
  1. Create a Payment Intent
  2. Charge YOUR card
  3. Money goes to YOUR Stripe account (not vendor's)
  4. This doesn't pay the vendor!

## Solutions for Paying Vendors

### Option 1: Manual Payment Entry (Current Solution) ✅

**How it works:**

1. You pay vendor via bank transfer, check, or other method
2. Record the payment manually in the system
3. Match it to the payable invoice
4. Invoice status updates to "paid"

**Pros:**

- Simple and works immediately
- No additional Stripe setup needed
- Works with any payment method

**Cons:**

- Manual entry required
- No automatic tracking

### Option 2: Stripe Connect (For Sending Money to Vendors) 🔄

**What is Stripe Connect:**

- Allows you to send payments to other Stripe accounts
- Vendors connect their Stripe accounts to your platform
- You can transfer money directly to vendor accounts

**How it would work:**

1. Vendor connects their Stripe account
2. You click "Pay Vendor" on payable invoice
3. System creates a **Transfer** (not Payment Intent)
4. Money moves from your Stripe account to vendor's account
5. Webhook tracks the transfer
6. Invoice status updates

**Requirements:**

- Stripe Connect setup
- Vendors need Stripe accounts
- Additional API implementation

**Pros:**

- Automated vendor payments
- Integrated with Stripe
- Automatic tracking

**Cons:**

- Complex setup
- Vendors must have Stripe accounts
- Additional Stripe fees

### Option 3: Stripe Transfers (From Your Balance)

**How it works:**

1. You have money in your Stripe account balance
2. Create a Transfer to vendor's bank account
3. Money moves from your balance to vendor

**Requirements:**

- Money must be in your Stripe account
- Vendor bank account details
- Stripe Transfer API

## Webhook Behavior

### Current Webhooks (For Receivables)

**Events tracked:**

- `payment_intent.succeeded` - Customer paid you
- `payment_intent.payment_failed` - Payment failed
- `charge.succeeded` - Charge completed
- `charge.refunded` - Refund processed

**What happens:**

1. Customer pays → Stripe sends webhook
2. Your webhook handler receives event
3. Payment record created in database
4. Payment matched to invoice (if invoice_id provided)
5. Invoice status updated

### For Payables (If Using Stripe Connect)

**Would need additional events:**

- `transfer.created` - Transfer to vendor initiated
- `transfer.paid` - Transfer completed
- `transfer.failed` - Transfer failed

## Recommendation

**For Now:**

- ✅ Use **manual payment entry** for payable invoices
- ✅ Use **Stripe "Pay with Stripe"** only for receivable invoices
- ✅ Remove "Pay with Stripe" button from payable invoices (already done)

**Future Enhancement:**

- Implement Stripe Connect if you want automated vendor payments
- This requires:
  - Stripe Connect setup
  - Vendor onboarding flow
  - Transfer API implementation
  - Additional webhook handlers

## Summary

| Invoice Type   | Payment Method        | Money Flow                    | Status         |
| -------------- | --------------------- | ----------------------------- | -------------- |
| **Receivable** | Stripe Payment Intent | Customer → Your Account       | ✅ Works       |
| **Payable**    | Manual Entry          | Your Bank → Vendor            | ✅ Works       |
| **Payable**    | Stripe Connect        | Your Account → Vendor Account | 🔄 Needs Setup |

**Key Point:** Your Stripe account is for **receiving money**. To **send money** to vendors, you need either manual entry or Stripe Connect.
