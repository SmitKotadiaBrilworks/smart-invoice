import { useMemo, useState, useEffect } from "react";
import { useInvoices } from "./useInvoices";
import { usePayments } from "./usePayments";
import type { DashboardKPIs, ARAgingBucket } from "@/types";
import { calculateInvoicePaymentAmounts } from "@/lib/utils/invoice-payments";
import { convertAmoutToLocalCurrency } from "@/lib/utils/currency-conversion";

export const useDashboardKPIs = (
  workspaceId: string,
  targetCurrency: string = "USD"
) => {
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(
    workspaceId,
    {}
  );
  const invoices = invoicesData?.invoices ?? [];
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(
    workspaceId,
    {}
  );

  const payments = paymentsData?.payments ?? [];

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateKPIs = async () => {
      setIsCalculating(true);
      if (!invoices || invoices.length === 0) {
        setKpis({
          cash_in_expected: 0,
          cash_out_expected: 0,
          amount_received: 0,
          amount_paid: 0,
          overdue_count: 0,
          overdue_amount: 0,
          avg_days_to_collect: 0,
        });
        setIsCalculating(false);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Helper to batch convert amounts
      const convertAndSum = async (
        items: any[],
        getAmount: (item: any) => number,
        getCurrency: (item: any) => string
      ) => {
        // Group amounts by currency
        const amountsByCurrency: Record<string, number> = {};
        items.forEach((item) => {
          const currency = getCurrency(item) || "USD";
          const amount = getAmount(item);
          amountsByCurrency[currency] =
            (amountsByCurrency[currency] || 0) + amount;
        });

        // Convert each currency total
        let total = 0;
        for (const [currency, amount] of Object.entries(amountsByCurrency)) {
          const converted = await convertAmoutToLocalCurrency(
            amount,
            targetCurrency,
            currency
          );
          total += converted;
        }
        return total;
      };

      // Calculate Cash In (Expected)
      const cashInInvoices = invoices.filter((inv) => {
        const isReceivable =
          inv.invoice_type === "receivable" ||
          (!inv.invoice_type && inv.status === "draft");
        return isReceivable && inv.status !== "paid";
      });
      const cashInExpected = await convertAndSum(
        cashInInvoices,
        (inv) => calculateInvoicePaymentAmounts(inv).remaining,
        (inv) => inv.currency
      );

      // Calculate Cash Out (Expected)
      const cashOutInvoices = invoices.filter((inv) => {
        const isPayable =
          inv.invoice_type === "payable" ||
          (!inv.invoice_type && inv.status === "approved");
        return isPayable && inv.status !== "paid";
      });
      const cashOutExpected = await convertAndSum(
        cashOutInvoices,
        (inv) => calculateInvoicePaymentAmounts(inv).remaining,
        (inv) => inv.currency
      );

      // Calculate Amount Received
      const receivedPayments =
        payments?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          return payment.matches.some((match) => {
            const invoice = match.invoice;
            if (!invoice) return false;
            return (
              invoice.invoice_type === "receivable" ||
              (!invoice.invoice_type && invoice.status === "draft")
            );
          });
        }) || [];
      const amountReceived = await convertAndSum(
        receivedPayments,
        (payment) => payment.amount || 0,
        (payment) => payment.currency
      );

      // Calculate Amount Paid
      const paidPayments =
        payments?.filter((payment) => {
          if (!payment.matches || payment.matches.length === 0) return false;
          return payment.matches.some((match) => {
            const invoice = match.invoice;
            if (!invoice) return false;
            return (
              invoice.invoice_type === "payable" ||
              (!invoice.invoice_type && invoice.status === "approved")
            );
          });
        }) || [];
      const amountPaid = await convertAndSum(
        paidPayments,
        (payment) => payment.amount || 0,
        (payment) => payment.currency
      );

      // Calculate Overdue Invoices
      const overdueInvoices = invoices.filter((inv) => {
        if (inv.status === "paid") return false;
        const dueDate = new Date(inv.due_date);
        return dueDate < today;
      });
      const overdueCount = overdueInvoices.length;
      const overdueAmount = await convertAndSum(
        overdueInvoices,
        (inv) => calculateInvoicePaymentAmounts(inv).remaining,
        (inv) => inv.currency
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

      setKpis({
        cash_in_expected: cashInExpected,
        cash_out_expected: cashOutExpected,
        amount_received: amountReceived,
        amount_paid: amountPaid,
        overdue_count: overdueCount,
        overdue_amount: overdueAmount,
        avg_days_to_collect: avgDays,
      });
      setIsCalculating(false);
    };

    if (!invoicesLoading && !paymentsLoading) {
      calculateKPIs();
    }
  }, [invoices, payments, targetCurrency, invoicesLoading, paymentsLoading]);

  return {
    data: kpis,
    isLoading: invoicesLoading || paymentsLoading || isCalculating,
  };
};

export const useARAging = (
  workspaceId: string,
  targetCurrency: string = "USD"
) => {
  const { data: invoicesData, isLoading } = useInvoices(workspaceId, {});
  const invoices = invoicesData?.invoices ?? [];

  const [arAging, setArAging] = useState<ARAgingBucket[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateAging = async () => {
      setIsCalculating(true);
      if (!invoices || invoices.length === 0) {
        setArAging([
          { bucket: "0-30", count: 0, amount: 0 },
          { bucket: "31-60", count: 0, amount: 0 },
          { bucket: "61-90", count: 0, amount: 0 },
          { bucket: "90+", count: 0, amount: 0 },
        ]);
        setIsCalculating(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const buckets: { [key: string]: { count: number; amount: number } } = {
        "0-30": { count: 0, amount: 0 },
        "31-60": { count: 0, amount: 0 },
        "61-90": { count: 0, amount: 0 },
        "90+": { count: 0, amount: 0 },
      };

      // Filter for receivable invoices that are not fully paid
      const receivableInvoices = invoices.filter((inv) => {
        const isReceivable =
          inv.invoice_type === "receivable" ||
          (!inv.invoice_type && inv.status === "draft");

        // Only include unpaid or partially paid receivables
        const isUnpaid = inv.status !== "paid";

        // Calculate outstanding amount using helper function
        const { remaining } = calculateInvoicePaymentAmounts(inv);

        return isReceivable && isUnpaid && remaining > 0;
      });

      // Calculate days outstanding and convert amounts
      const promises = receivableInvoices.map(async (inv) => {
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);

        // Calculate days past due (negative if not yet due)
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate outstanding amount using helper function
        const { remaining } = calculateInvoicePaymentAmounts(inv);
        const convertedAmount = await convertAmoutToLocalCurrency(
          remaining,
          targetCurrency,
          inv.currency
        );

        return { daysPastDue, convertedAmount };
      });

      const results = await Promise.all(promises);

      results.forEach(({ daysPastDue, convertedAmount }) => {
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
        buckets[bucket].amount += convertedAmount;
      });

      setArAging([
        { bucket: "0-30", ...buckets["0-30"] },
        { bucket: "31-60", ...buckets["31-60"] },
        { bucket: "61-90", ...buckets["61-90"] },
        { bucket: "90+", ...buckets["90+"] },
      ]);
      setIsCalculating(false);
    };

    if (!isLoading) {
      calculateAging();
    }
  }, [invoices, targetCurrency, isLoading]);

  return {
    data: arAging,
    isLoading: isLoading || isCalculating,
  };
};
