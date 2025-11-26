import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { TokenManager } from "@/lib/auth/token-manager";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = TokenManager.getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token found" },
        { status: 401 }
      );
    }

    // Create Supabase client and refresh session
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      // Clear tokens on error
      const errorResponse = NextResponse.json(
        { error: error?.message || "Failed to refresh session" },
        { status: 401 }
      );
      TokenManager.clearTokens(errorResponse);
      return errorResponse;
    }

    // Create response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    // Update tokens in cookies
    TokenManager.setTokens(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
        user_id: data.user?.id || null,
      },
      response
    );

    return response;
  } catch (error: any) {
    const errorResponse = NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
    TokenManager.clearTokens(errorResponse);
    return errorResponse;
  }
}
