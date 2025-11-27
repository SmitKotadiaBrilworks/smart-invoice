import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { TokenManager } from "@/lib/auth/token-manager";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Try to sign out from Supabase, but don't fail if it errors
    if (token) {
      try {
        const supabase = createServerClient(token);
        await supabase.auth.signOut();
      } catch (signOutError) {
        // Continue even if signOut fails - we still want to clear cookies
        console.warn("Supabase signOut error (ignored):", signOutError);
      }
    }

    // Always clear cookies regardless of Supabase signOut result
    const response = NextResponse.json({ success: true });
    TokenManager.clearTokens(response);

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
