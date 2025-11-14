import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const AUTH_TOKEN_KEY = "sb-auth-token";
const REFRESH_TOKEN_KEY = "sb-refresh-token";
const USER_ID_KEY = "sb-user-id";

// Supabase client for token operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string | null;
}

export class TokenManager {
  // Set tokens in cookies on a NextResponse
  static setTokens(tokenData: TokenData, response: NextResponse) {
    // Set access token (expires when token expires)
    const expiresAt = new Date(tokenData.expires_at * 1000);
    response.cookies.set(AUTH_TOKEN_KEY, tokenData.access_token, {
      expires: expiresAt,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      httpOnly: false, // Allow client-side access for API calls
    });

    // Set refresh token (longer expiry)
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30); // 30 days

    response.cookies.set(REFRESH_TOKEN_KEY, tokenData.refresh_token, {
      expires: refreshExpiresAt,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      httpOnly: false,
    });

    // Set user ID
    if (tokenData.user_id) {
      response.cookies.set(USER_ID_KEY, tokenData.user_id, {
        expires: refreshExpiresAt,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        httpOnly: false,
      });
    }
  }

  // Get access token from cookies
  static getAccessToken(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(AUTH_TOKEN_KEY)?.value || null;
  }

  // Get refresh token from cookies
  static getRefreshToken(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;
  }

  // Get user ID from cookies
  static getUserId(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(USER_ID_KEY)?.value || null;
  }

  // Check if access token is expired
  static isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Refresh access token using refresh token
  static async refreshAccessToken(): Promise<TokenData | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return null;
      }

      const tokenData: TokenData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
        user_id: data.session.user.id,
      };

      return tokenData;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  }

  // Get valid access token (refresh if needed)
  static async getValidAccessToken(): Promise<string | null> {
    if (!this.isTokenExpired()) {
      return this.getAccessToken();
    }

    const tokenData = await this.refreshAccessToken();
    return tokenData?.access_token || null;
  }

  // Clear all tokens from a NextResponse
  static clearTokens(response: NextResponse) {
    response.cookies.delete(AUTH_TOKEN_KEY);
    response.cookies.delete(REFRESH_TOKEN_KEY);
    response.cookies.delete(USER_ID_KEY);
  }

  static getUserIdFromToken(token: string): string | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        Buffer.from(base64, "base64").toString("utf-8")
      );
      return payload.sub || null;
    } catch (err) {
      console.error("Failed to decode token:", err);
      return null;
    }
  }
}
