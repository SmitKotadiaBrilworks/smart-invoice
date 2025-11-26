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
      invoice_type?: "receivable" | "payable";
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
    if (filters?.invoice_type) {
      query = query.eq("invoice_type", filters.invoice_type);
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
    invoiceType: "receivable" | "payable" = "payable",
    tempFilePath?: string | null,
    mimeType?: string
  ) => {
    // Check if invoice with same workspace_id, vendor_id, and invoice_no already exists
    const { data: existingInvoice, error: checkError } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_no, status")
      .eq("workspace_id", workspaceId)
      .eq("vendor_id", vendorId)
      .eq("invoice_no", extraction.invoice_number)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine, other errors should be thrown
      throw checkError;
    }

    if (existingInvoice) {
      // Invoice already exists - return existing invoice with a clear error message
      const error = new Error(
        `Invoice number "${extraction.invoice_number}" already exists for this vendor in this workspace.`
      ) as any;
      error.code = "DUPLICATE_INVOICE";
      error.existingInvoice = existingInvoice;
      throw error;
    }

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

    if (invoiceError) {
      // Check if it's a duplicate key error
      if (
        invoiceError.code === "23505" ||
        invoiceError.message?.includes("duplicate key") ||
        invoiceError.message?.includes("unique constraint")
      ) {
        const error = new Error(
          `Invoice number "${extraction.invoice_number}" already exists for this vendor in this workspace.`
        ) as any;
        error.code = "DUPLICATE_INVOICE";
        throw error;
      }
      throw invoiceError;
    }

    // Move file from temp location to final location if it was uploaded
    if (tempFilePath && source === "upload") {
      try {
        const finalFilePath = `${workspaceId}/${invoice.id}`;
        const fileExtension = tempFilePath.split(".").pop() || "pdf";
        const finalPath = `${finalFilePath}.${fileExtension}`;

        // Download from temp location
        const { data: fileData, error: downloadError } =
          await supabaseAdmin.storage.from("invoices").download(tempFilePath);

        if (!downloadError && fileData) {
          // Upload to final location
          const { error: moveError } = await supabaseAdmin.storage
            .from("invoices")
            .upload(finalPath, await fileData.arrayBuffer(), {
              contentType: mimeType || "application/pdf",
              upsert: true,
            });

          if (!moveError) {
            // Delete temp file
            await supabaseAdmin.storage.from("invoices").remove([tempFilePath]);
          } else {
            console.error("Error moving file to final location:", moveError);
          }
        }
      } catch (storageError) {
        console.error("Error handling file storage:", storageError);
        // Don't fail invoice creation if file storage fails
      }
    }

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
