import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { TokenManager } from "@/lib/auth/token-manager";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const supabase = createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "No session created" },
        { status: 401 }
      );
    }

    // Create response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    // Set tokens in cookies
    TokenManager.setTokens(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
        user_id: data.user.id,
      },
      response
    );

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
