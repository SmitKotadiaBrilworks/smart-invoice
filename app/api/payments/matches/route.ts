import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { paymentBackend } from "@/lib/backend/payments";

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
    const { workspace_id, invoice_id, payment_id, score, method, reason } =
      body;

    if (!workspace_id || !invoice_id || !payment_id) {
      return NextResponse.json(
        { error: "workspace_id, invoice_id, and payment_id required" },
        { status: 400 }
      );
    }

    const match = await paymentBackend.createMatch(
      workspace_id,
      invoice_id,
      payment_id,
      score || 100,
      method || "manual",
      reason
    );

    return NextResponse.json({ match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
