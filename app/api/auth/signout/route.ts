import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { TokenManager } from "@/lib/auth/token-manager";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabase = createServerClient(token);
    const { error } = await supabase.auth.signOut();

    // Create response
    const response = NextResponse.json({ success: true });

    // Clear tokens from cookies
    TokenManager.clearTokens(response);

    if (error) {
      // Even if signOut fails, clear cookies
      return response;
    }

    return response;
  } catch (error: any) {
    // Still clear cookies even on error
    const response = NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
    TokenManager.clearTokens(response);
    return response;
  }
}
