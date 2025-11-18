import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { TokenManager } from "@/lib/auth/token-manager";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    const supabase = createServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create user profile if user was created
    if (data.user) {
      try {
        await supabaseAdmin.from("user_profiles").insert({
          id: data.user.id,
          email: data.user.email || email,
          name: name || null,
        });
      } catch (profileError: any) {
        // If profile already exists (from trigger), ignore the error
        if (!profileError.message?.includes("duplicate")) {
          console.error("Error creating user profile:", profileError);
        }
      }
    }

    // Create response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    // Set tokens in cookies if session exists
    if (data.session) {
      TokenManager.setTokens(
        {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at!,
          user_id: data.user.id,
        },
        response
      );
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
