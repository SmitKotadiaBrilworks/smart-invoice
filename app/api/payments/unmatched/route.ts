import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { paymentBackend } from "@/lib/backend/payments";

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

    const payments = await paymentBackend.getUnmatchedPayments(workspaceId);
    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
