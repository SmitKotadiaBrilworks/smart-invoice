import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase/server";

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

    return NextResponse.json({ user: data.user, session: data.session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
