import { useMemo } from "react";
import { useInvoices } from "./useInvoices";
import { usePayments } from "./usePayments";
import type { DashboardKPIs } from "@/types";

export const useDashboardKPIs = (workspaceId: string) => {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(
    workspaceId,
    {}
  );
  const { data: payments, isLoading: paymentsLoading } = usePayments(
    workspaceId,
    {}
  );

  const kpis: DashboardKPIs = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        cash_in_expected: 0,
        cash_out_expected: 0,
        amount_received: 0,
        amount_paid: 0,
        overdue_count: 0,
        overdue_amount: 0,
        avg_days_to_collect: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate Cash In (Expected) - Receivables: Draft invoices not yet matched to payments
    // These are invoices we've issued to customers and expect to receive payment for
    // Note: Using draft status to distinguish from payables (approved invoices)
    const cashInExpected = invoices
      .filter(
        (inv) => inv.status === "draft" && !inv.matches?.some((m) => m.payment)
      )
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate Cash Out (Expected) - Payables: Approved vendor invoices not yet paid
    // These are invoices from vendors that we need to pay (only approved status, excludes paid/partially_paid)
    // Note: This is mutually exclusive from Cash In to avoid double-counting
    const cashOutExpected = invoices
      .filter(
        (inv) =>
          inv.status === "approved" && !inv.matches?.some((m) => m.payment)
      )
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate Amount Received - Payments matched to draft invoices (receivables)
    // This represents money received from customers for receivables
    const amountReceived =
      payments
        ?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          // Check if any matched invoice is a draft (receivable)
          return payment.matches.some(
            (match) => match.invoice?.status === "draft"
          );
        })
        .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate Amount Paid - Payments matched to approved invoices (payables)
    // This represents money paid to vendors for payables
    const amountPaid =
      payments
        ?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          // Check if any matched invoice is approved (payable)
          return payment.matches.some(
            (match) => match.invoice?.status === "approved"
          );
        })
        .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate Overdue Invoices
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === "paid") return false;
      const dueDate = new Date(inv.due_date);
      return dueDate < today;
    });

    const overdueCount = overdueInvoices.length;
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0
    );

    // Calculate Average Days to Collect
    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    let avgDays = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const issueDate = new Date(inv.issue_date);
        const paidDate = inv.matches?.[0]?.payment?.received_at
          ? new Date(inv.matches[0].payment.received_at)
          : new Date(inv.updated_at);
        const days = Math.floor(
          (paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(0, days);
      }, 0);
      avgDays = Math.round(totalDays / paidInvoices.length);
    }

    return {
      cash_in_expected: cashInExpected,
      cash_out_expected: cashOutExpected,
      amount_received: amountReceived,
      amount_paid: amountPaid,
      overdue_count: overdueCount,
      overdue_amount: overdueAmount,
      avg_days_to_collect: avgDays,
    };
  }, [invoices, payments]);

  return {
    data: kpis,
    isLoading: invoicesLoading || paymentsLoading,
  };
};
