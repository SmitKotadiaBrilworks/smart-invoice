"use client";

import { useState, useEffect } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Modal, Button, Form, message, Alert } from "antd";
import { useCreatePaymentIntent } from "@/hooks/useStripe";
import { useStripeIntegration } from "@/hooks/useStripeIntegration";
import { formatCurrency } from "@/lib/constants/currencies";

interface StripePaymentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  workspaceId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
}

function CheckoutForm({
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  amount: number;
  currency: string;
  onSuccess?: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "An error occurred");
        setLoading(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments?success=true`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        setLoading(false);
      } else {
        message.success("Payment processed successfully!");
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      <div className="flex justify-end gap-3 mt-6">
        <Button onClick={onCancel} size="large">
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!stripe || !elements}
          size="large"
          className="px-8"
        >
          Pay {formatCurrency(amount, currency)}
        </Button>
      </div>
    </form>
  );
}

export default function StripePaymentModal({
  open,
  onCancel,
  onSuccess,
  workspaceId,
  invoiceId,
  amount,
  currency,
  customerEmail,
  description,
}: StripePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [options, setOptions] = useState<StripeElementsOptions | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const createPaymentIntent = useCreatePaymentIntent();

  // Get workspace Stripe integration to get publishable key
  const { data: stripeIntegration } = useStripeIntegration(workspaceId);

  // Initialize Stripe with workspace-specific publishable key
  useEffect(() => {
    if (stripeIntegration?.integration?.publishable_key) {
      setStripePromise(
        loadStripe(stripeIntegration.integration.publishable_key)
      );
    } else {
      // Fallback to environment variable if workspace key not available
      const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (envKey) {
        setStripePromise(loadStripe(envKey));
      }
    }
  }, [stripeIntegration]);

  useEffect(() => {
    if (open && amount > 0) {
      // Check if Stripe is connected
      if (!stripeIntegration?.connected) {
        message.error(
          "Stripe is not connected for this workspace. Please configure it in Settings > Integrations."
        );
        onCancel();
        return;
      }

      // Create payment intent when modal opens
      createPaymentIntent.mutate(
        {
          amount,
          currency,
          workspace_id: workspaceId,
          invoice_id: invoiceId,
          customer_email: customerEmail,
          description: description || `Payment for invoice ${invoiceId || ""}`,
        },
        {
          onSuccess: (data) => {
            setClientSecret(data.clientSecret);
            setOptions({
              clientSecret: data.clientSecret,
              appearance: {
                theme: "stripe",
              },
            });
          },
          onError: (error: any) => {
            message.error(
              error.response?.data?.error || "Failed to initialize payment"
            );
            onCancel();
          },
        }
      );
    } else {
      setClientSecret(null);
      setOptions(null);
    }
  }, [open, amount, currency, workspaceId, invoiceId, stripeIntegration]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-lg font-semibold">💳</span>
          </div>
          <span className="text-xl font-semibold text-text-primary">
            Pay with Stripe
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={600}
    >
      {!stripeIntegration?.connected ? (
        <div className="text-center py-8">
          <Alert
            message="Stripe Not Connected"
            description="Please configure Stripe integration in Settings > Integrations to process payments."
            type="warning"
            showIcon
            action={
              <Button
                type="primary"
                onClick={() => {
                  onCancel();
                  window.location.href = "/settings?tab=integrations";
                }}
              >
                Go to Settings
              </Button>
            }
          />
        </div>
      ) : options && clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      ) : (
        <div className="text-center py-8">
          <p>Initializing payment...</p>
        </div>
      )}
    </Modal>
  );
}
