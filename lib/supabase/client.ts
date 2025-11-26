"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import Cookies from "js-cookie";

const AUTH_TOKEN_KEY = "sb-auth-token";
const REFRESH_TOKEN_KEY = "sb-refresh-token";
const USER_ID_KEY = "sb-user-id";

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storage: typeof window !== "undefined" ? localStorage : undefined,
      },
    }
  );

  return supabaseInstance;
}

let client: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseClient() {
  if (client) return client;

  client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storage: typeof window !== "undefined" ? localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (url, options = {}) => {
          // Get auth token from cookies (client-side)
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(";").shift();
            return null;
          };

          const authToken = getCookie("sb-auth-token");
          const headers = new Headers(options?.headers);

          if (authToken) {
            headers.set("Authorization", `Bearer ${authToken}`);
          }

          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    }
  );

  return client;
}

export function resetSupabaseClient() {
  client = null;
}

export function resetSupabaseInstance() {
  supabaseInstance = null;
}

// Client-side token management
export const clientTokenManager = {
  setTokens: ({
    access_token,
    refresh_token,
    expires_at,
    user_id,
  }: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user_id?: string | null;
  }) => {
    Cookies.set(AUTH_TOKEN_KEY, access_token, {
      expires: new Date(expires_at * 1000),
      path: "/",
    });

    Cookies.set(REFRESH_TOKEN_KEY, refresh_token, {
      expires: 30, // days
      path: "/",
    });

    if (user_id) {
      Cookies.set(USER_ID_KEY, user_id, {
        expires: 30,
        path: "/",
      });
    }
  },

  getAccessToken: () => Cookies.get(AUTH_TOKEN_KEY) || null,

  getRefreshToken: () => Cookies.get(REFRESH_TOKEN_KEY) || null,

  getUserId: () => Cookies.get(USER_ID_KEY) || null,

  clearTokens: () => {
    Cookies.remove(AUTH_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
    Cookies.remove(USER_ID_KEY, { path: "/" });
  },

  isTokenExpired: () => {
    const token = clientTokenManager.getAccessToken();
    if (!token) return true;

    try {
      const base64Payload = token.split(".")[1];
      const jsonPayload = atob(
        base64Payload.replace(/-/g, "+").replace(/_/g, "/")
      );
      const payload = JSON.parse(jsonPayload);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (err) {
      console.error("Failed to decode token:", err);
      return true;
    }
  },

  willTokenExpireSoon: (secondsFromNow: number = 300) => {
    const token = clientTokenManager.getAccessToken();
    if (!token) return true;

    try {
      const base64Payload = token.split(".")[1];
      const jsonPayload = atob(
        base64Payload.replace(/-/g, "+").replace(/_/g, "/")
      );
      const payload = JSON.parse(jsonPayload);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      return timeUntilExpiry <= secondsFromNow;
    } catch (err) {
      console.error("Failed to decode token:", err);
      return true;
    }
  },
};

// Export default client for backward compatibility
export const supabase = createSupabaseClient();
