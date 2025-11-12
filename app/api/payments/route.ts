import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { paymentBackend } from "@/lib/backend/payments";
import { PaymentSource, PaymentStatus } from "@/lib/supabase/database.types";

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
      source: (searchParams.get("source") as PaymentSource) || undefined,
      status: (searchParams.get("status") as PaymentStatus) || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    };

    const payments = await paymentBackend.getPayments(workspaceId, filters);
    return NextResponse.json({ payments });
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
    const { workspace_id, ...paymentData } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    const payment = await paymentBackend.createPayment(
      workspace_id,
      paymentData
    );
    return NextResponse.json({ payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
