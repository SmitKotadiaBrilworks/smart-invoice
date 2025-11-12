import { supabaseAdmin } from "@/lib/supabase/server";
import type { Payment, PaymentMatch } from "@/types";
import type {
  PaymentSource,
  PaymentStatus,
} from "@/lib/supabase/database.types";

export const paymentBackend = {
  // Get payments for a workspace
  getPayments: async (
    workspaceId: string,
    filters?: {
      source?: PaymentSource;
      status?: PaymentStatus;
      date_from?: string;
      date_to?: string;
    }
  ) => {
    let query = supabaseAdmin
      .from("payments")
      .select(
        `
        *,
        matches:payment_matches(
          *,
          invoice:invoices(*)
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .order("received_at", { ascending: false });

    if (filters?.source) {
      query = query.eq("source", filters.source);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.date_from) {
      query = query.gte("received_at", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("received_at", filters.date_to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Payment[];
  },

  // Get single payment
  getPayment: async (paymentId: string, workspaceId: string) => {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
        *,
        matches:payment_matches(
          *,
          invoice:invoices(*)
        )
      `
      )
      .eq("id", paymentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return data as Payment;
  },

  // Create payment
  createPayment: async (
    workspaceId: string,
    paymentData: Omit<
      Payment,
      "id" | "workspace_id" | "created_at" | "updated_at"
    >
  ) => {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({
        workspace_id: workspaceId,
        ...paymentData,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },

  // Create payment match
  createMatch: async (
    workspaceId: string,
    invoiceId: string,
    paymentId: string,
    score: number,
    method: "auto" | "manual",
    reason?: string
  ) => {
    const { data, error } = await supabaseAdmin
      .from("payment_matches")
      .insert({
        workspace_id: workspaceId,
        invoice_id: invoiceId,
        payment_id: paymentId,
        score,
        method,
        reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PaymentMatch;
  },

  // Get unmatched payments
  getUnmatchedPayments: async (workspaceId: string) => {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .not(
        "id",
        "in",
        supabaseAdmin
          .from("payment_matches")
          .select("payment_id")
          .eq("workspace_id", workspaceId)
      )
      .order("received_at", { ascending: false });

    if (error) throw error;
    return data as Payment[];
  },

  // Get suggested matches for a payment
  getSuggestedMatches: async (paymentId: string, workspaceId: string) => {
    const payment = await paymentBackend.getPayment(paymentId, workspaceId);

    // Find invoices with similar amount and currency
    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("currency", payment.currency)
      .in("status", ["approved", "partially_paid"])
      .gte("total", payment.amount * 0.9) // Within 10% tolerance
      .lte("total", payment.amount * 1.1);

    if (error) throw error;

    // Calculate match scores
    const matches = invoices.map((invoice) => {
      const amountDiff = Math.abs(invoice.total - payment.amount);
      const score = 100 - (amountDiff / payment.amount) * 100;

      return {
        invoice,
        score: Math.max(0, score),
        reason: `Amount within ${((amountDiff / payment.amount) * 100).toFixed(
          1
        )}%`,
      };
    });

    return matches.sort((a, b) => b.score - a.score);
  },
};
