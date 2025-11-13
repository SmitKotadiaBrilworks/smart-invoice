import { supabaseAdmin } from "@/lib/supabase/server";
import type { Invoice, InvoiceLine, InvoiceExtraction } from "@/types";
import type { InvoiceStatus } from "@/lib/supabase/database.types";

export const invoiceBackend = {
  // Get invoices for a workspace
  getInvoices: async (
    workspaceId: string,
    filters?: {
      status?: InvoiceStatus;
      vendor_id?: string;
      date_from?: string;
      date_to?: string;
    }
  ) => {
    let query = supabaseAdmin
      .from("invoices")
      .select(
        `
        *,
        vendor:vendors(*),
        lines:invoice_lines(*),
        matches:payment_matches(
          *,
          payment:payments(*)
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.vendor_id) {
      query = query.eq("vendor_id", filters.vendor_id);
    }
    if (filters?.date_from) {
      query = query.gte("due_date", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("due_date", filters.date_to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Invoice[];
  },

  // Get single invoice
  getInvoice: async (invoiceId: string, workspaceId: string) => {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select(
        `
        *,
        vendor:vendors(*),
        lines:invoice_lines(*),
        matches:payment_matches(
          *,
          payment:payments(*)
        )
      `
      )
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  // Create invoice from extraction
  createInvoice: async (
    workspaceId: string,
    extraction: InvoiceExtraction,
    vendorId: string,
    userId: string,
    source: "upload" | "email" = "upload",
    confidence: number = 0.8,
    invoiceType: "receivable" | "payable" = "payable"
  ) => {
    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        workspace_id: workspaceId,
        vendor_id: vendorId,
        invoice_no: extraction.invoice_number,
        issue_date: extraction.issue_date,
        due_date: extraction.due_date,
        currency: extraction.currency,
        subtotal: extraction.subtotal,
        tax_total: extraction.tax_total,
        total: extraction.total,
        status: "draft",
        invoice_type: invoiceType,
        confidence,
        source,
        created_by: userId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Insert invoice lines
    if (extraction.line_items.length > 0) {
      const lines = extraction.line_items.map((line) => ({
        invoice_id: invoice.id,
        description: line.description,
        qty: line.qty,
        unit_price: line.unit_price,
        tax_percent: line.tax_percent,
        line_total: line.line_total,
        category_code: line.suggested_category,
      }));

      const { error: linesError } = await supabaseAdmin
        .from("invoice_lines")
        .insert(lines);

      if (linesError) throw linesError;
    }

    return invoice as Invoice;
  },

  // Update invoice
  updateInvoice: async (
    invoiceId: string,
    workspaceId: string,
    updates: Partial<Invoice>
  ) => {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update(updates)
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  // Approve invoice
  approveInvoice: async (invoiceId: string, workspaceId: string) => {
    return invoiceBackend.updateInvoice(invoiceId, workspaceId, {
      status: "approved",
    });
  },

  // Delete invoice
  deleteInvoice: async (invoiceId: string, workspaceId: string) => {
    const { error } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return { success: true };
  },
};
