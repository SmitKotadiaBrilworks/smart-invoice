import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Get environment variables at runtime
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
};

const getSupabaseServiceKey = () => {
  // Try both possible env var names
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!key) {
    throw new Error(
      "Missing env.SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE"
    );
  }
  return key;
};

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
};

// Server-side client with service role for admin operations
export const supabaseAdmin = createClient<Database>(
  getSupabaseUrl(),
  getSupabaseServiceKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client for user-specific operations (uses user's JWT)
export const createServerClient = (accessToken?: string) => {
  const client = createClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {},
      },
    }
  );

  return client;
};
