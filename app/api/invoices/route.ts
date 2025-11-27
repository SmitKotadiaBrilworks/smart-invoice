import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { invoiceBackend } from "@/lib/backend/invoices";
import { InvoiceStatus } from "@/lib/supabase/database.types";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    const filters = {
      status: (searchParams.get("status") as InvoiceStatus) || undefined,
      vendor_id: searchParams.get("vendor_id") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      invoice_type:
        (searchParams.get("invoice_type") as "receivable" | "payable") ||
        undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "10"),
    };

    const { invoices, count } = await invoiceBackend.getInvoices(
      workspaceId,
      filters
    );
    return NextResponse.json({ invoices, count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspace_id,
      extraction,
      vendor_id,
      source,
      confidence,
      invoice_type,
      file_path,
      mime_type,
    } = body;

    if (!workspace_id || !extraction || !vendor_id) {
      return NextResponse.json(
        { error: "workspace_id, extraction, and vendor_id required" },
        { status: 400 }
      );
    }

    const invoice = await invoiceBackend.createInvoice(
      workspace_id,
      extraction,
      vendor_id,
      user.id,
      source || "upload",
      confidence || 0.8,
      invoice_type || "payable",
      file_path,
      mime_type
    );

    return NextResponse.json({ invoice });
  } catch (error: any) {
    // Handle duplicate invoice error with appropriate status code
    if (error.code === "DUPLICATE_INVOICE") {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          existingInvoice: error.existingInvoice,
        },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
