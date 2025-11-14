import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clientTokenManager } from "@/lib/supabase/client";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];
let refreshPromise: Promise<string | null> | null = null;

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // Use API route to refresh and update cookies
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          // Clear session on error
          const { supabase } = await import("@/lib/supabase/client");
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            clientTokenManager.clearTokens();
          }
          throw new Error(data.error || "Failed to refresh token");
        }

        if (data.session) {
          // Update Supabase client session (non-blocking)
          const { supabase } = await import("@/lib/supabase/client");
          supabase.auth
            .setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            })
            .catch((err) => {
              console.error(
                "Error setting refreshed session in API client:",
                err
              );
            });

          // Also update cookies via clientTokenManager
          if (typeof window !== "undefined") {
            clientTokenManager.setTokens({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              user_id: data.session.user?.id ?? undefined,
            });
          }

          return data.session.access_token;
        }

        return null;
      } catch (error) {
        const { supabase } = await import("@/lib/supabase/client");
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          clientTokenManager.clearTokens();
        }
        throw error;
      }
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

// Ensure we always attach a fresh access token
apiClient.interceptors.request.use(async (config) => {
  let accessToken: string | null = null;
  let expiresAt: number | null = null;

  // First, try to get token from Supabase client session
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    accessToken = session?.access_token ?? null;
    expiresAt = session?.expires_at ? session.expires_at * 1000 : null;
  } catch (err) {
    console.warn("Error getting session from Supabase client:", err);
  }

  // Fallback: try to get token from cookies if Supabase session is not available
  if (!accessToken && typeof window !== "undefined") {
    try {
      const cookieToken = clientTokenManager.getAccessToken();
      if (cookieToken && !clientTokenManager.isTokenExpired()) {
        accessToken = cookieToken;
        // Try to decode expiry from token
        try {
          const payload = JSON.parse(atob(cookieToken.split(".")[1]));
          expiresAt = payload.exp ? payload.exp * 1000 : null;
        } catch {
          // If we can't decode, assume it's valid for now
        }
      }
    } catch (err) {
      console.warn("Error getting token from cookies:", err);
    }
  }

  // If token expires in the next 60 seconds, refresh proactively
  if (expiresAt && expiresAt - Date.now() <= 60_000) {
    try {
      accessToken = await refreshAccessToken();
    } catch (error) {
      // If refresh fails, let the request continue without token to force a 401
      accessToken = null;
    }
  }

  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Handle 401 errors and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        processQueue(null, newToken);

        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
