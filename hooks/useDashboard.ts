import { useMemo } from "react";
import { useInvoices } from "./useInvoices";
import { usePayments } from "./usePayments";
import type { DashboardKPIs, ARAgingBucket } from "@/types";

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

    // Calculate Cash In (Expected) - Receivables: Invoices not yet matched to payments
    // These are invoices we've issued to customers and expect to receive payment for
    // Use invoice_type if available, otherwise fall back to status-based logic
    const cashInExpected = invoices
      .filter((inv) => {
        // Check if invoice_type exists, otherwise use status-based fallback
        const isReceivable =
          inv.invoice_type === "receivable" ||
          (!inv.invoice_type && inv.status === "draft");
        return (
          isReceivable &&
          !inv.matches?.some((m) => m.payment) &&
          inv.status !== "paid"
        );
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate Cash Out (Expected) - Payables: Invoices not yet paid
    // These are invoices from vendors that we need to pay
    // Use invoice_type if available, otherwise fall back to status-based logic
    const cashOutExpected = invoices
      .filter((inv) => {
        // Check if invoice_type exists, otherwise use status-based fallback
        const isPayable =
          inv.invoice_type === "payable" ||
          (!inv.invoice_type && inv.status === "approved");
        return (
          isPayable &&
          !inv.matches?.some((m) => m.payment) &&
          inv.status !== "paid"
        );
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate Amount Received - Payments matched to receivable invoices
    // This represents money received from customers for receivables
    // Use invoice_type if available, otherwise fall back to status-based logic
    const amountReceived =
      payments
        ?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          // Check if any matched invoice is a receivable
          return payment.matches.some((match) => {
            const invoice = match.invoice;
            if (!invoice) return false;
            // Use invoice_type if available, otherwise check status
            return (
              invoice.invoice_type === "receivable" ||
              (!invoice.invoice_type && invoice.status === "draft")
            );
          });
        })
        .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate Amount Paid - Payments matched to payable invoices
    // This represents money paid to vendors for payables
    // Use invoice_type if available, otherwise fall back to status-based logic
    const amountPaid =
      payments
        ?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          // Check if any matched invoice is a payable
          return payment.matches.some((match) => {
            const invoice = match.invoice;
            if (!invoice) return false;
            // Use invoice_type if available, otherwise check status
            return (
              invoice.invoice_type === "payable" ||
              (!invoice.invoice_type && invoice.status === "approved")
            );
          });
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

export const useARAging = (workspaceId: string) => {
  const { data: invoices, isLoading } = useInvoices(workspaceId, {});

  const arAging: ARAgingBucket[] = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return [
        { bucket: "0-30", count: 0, amount: 0 },
        { bucket: "31-60", count: 0, amount: 0 },
        { bucket: "61-90", count: 0, amount: 0 },
        { bucket: "90+", count: 0, amount: 0 },
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter for receivable invoices that are not fully paid
    const receivableInvoices = invoices.filter((inv) => {
      const isReceivable =
        inv.invoice_type === "receivable" ||
        (!inv.invoice_type && inv.status === "draft");

      // Only include unpaid or partially paid receivables
      const isUnpaid = inv.status !== "paid";

      // Calculate outstanding amount (total - matched payments)
      const matchedAmount =
        inv.matches?.reduce(
          (sum, match) => sum + (match.payment?.amount || 0),
          0
        ) || 0;
      const outstandingAmount = inv.total - matchedAmount;

      return isReceivable && isUnpaid && outstandingAmount > 0;
    });

    // Initialize buckets
    const buckets: { [key: string]: { count: number; amount: number } } = {
      "0-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    };

    // Calculate days outstanding for each invoice
    receivableInvoices.forEach((inv) => {
      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);

      // Calculate days past due (negative if not yet due)
      const daysPastDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate outstanding amount
      const matchedAmount =
        inv.matches?.reduce(
          (sum, match) => sum + (match.payment?.amount || 0),
          0
        ) || 0;
      const outstandingAmount = inv.total - matchedAmount;

      // Categorize into buckets based on days past due
      let bucket: "0-30" | "31-60" | "61-90" | "90+";
      if (daysPastDue <= 0) {
        // Not yet due - count as 0-30
        bucket = "0-30";
      } else if (daysPastDue <= 30) {
        bucket = "0-30";
      } else if (daysPastDue <= 60) {
        bucket = "31-60";
      } else if (daysPastDue <= 90) {
        bucket = "61-90";
      } else {
        bucket = "90+";
      }

      buckets[bucket].count += 1;
      buckets[bucket].amount += outstandingAmount;
    });

    return [
      { bucket: "0-30", ...buckets["0-30"] },
      { bucket: "31-60", ...buckets["31-60"] },
      { bucket: "61-90", ...buckets["61-90"] },
      { bucket: "90+", ...buckets["90+"] },
    ];
  }, [invoices]);

  return {
    data: arAging,
    isLoading,
  };
};
