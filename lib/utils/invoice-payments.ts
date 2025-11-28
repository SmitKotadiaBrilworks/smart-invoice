import type { Invoice } from "@/types";

/**
 * Calculate paid and remaining amounts for an invoice
 * @param invoice - The invoice with matches
 * @returns Object with paid amount and remaining amount
 */
export function calculateInvoicePaymentAmounts(invoice: Invoice): {
  paid: number;
  remaining: number;
} {
  // Calculate total paid amount from completed payment matches
  const paid = (invoice.matches || []).reduce((sum, match) => {
    if (match.payment && match.payment.status === "completed") {
      return sum + (match.payment.amount || 0);
    }
    return sum;
  }, 0);

  const total = invoice.total || 0;
  const remaining = Math.max(0, total - paid);

  return { paid, remaining };
}

/**
 * Check if an invoice is fully paid
 * @param invoice - The invoice to check
 * @returns true if invoice is fully paid
 */
export function isInvoiceFullyPaid(invoice: Invoice): boolean {
  const { remaining } = calculateInvoicePaymentAmounts(invoice);
  return remaining <= 0;
}
