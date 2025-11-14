"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, clientTokenManager } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // Get user
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      try {
        // First, check if we have a token in cookies (client-side fallback)
        // Set session non-blocking to prevent hanging
        if (typeof window !== "undefined") {
          const cookieToken = clientTokenManager.getAccessToken();
          if (cookieToken && !clientTokenManager.isTokenExpired()) {
            // Token exists in cookies, try to set session in Supabase client first (non-blocking)
            const refreshToken = clientTokenManager.getRefreshToken();
            if (refreshToken) {
              supabase.auth
                .setSession({
                  access_token: cookieToken,
                  refresh_token: refreshToken,
                })
                .catch((setSessionErr) => {
                  console.warn(
                    "Failed to set session from cookies:",
                    setSessionErr
                  );
                });
            }
          }
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          // If token is expired or invalid, try to refresh from cookies
          if (
            error.message?.includes("expired") ||
            error.message?.includes("invalid") ||
            error.message?.includes("JWT")
          ) {
            // Try to refresh using API (which updates cookies)
            if (typeof window !== "undefined") {
              try {
                const refreshResponse = await fetch("/api/auth/refresh", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                });
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  if (refreshData.user) {
                    // Set session non-blocking
                    if (refreshData.session) {
                      supabase.auth
                        .setSession({
                          access_token: refreshData.session.access_token,
                          refresh_token: refreshData.session.refresh_token,
                        })
                        .catch(() => {});
                    }
                    return refreshData.user;
                  }
                }
              } catch (refreshErr) {
                console.error("Refresh failed in user query:", refreshErr);
              }
            }
          }
          // Return null instead of throwing to prevent infinite loading
          return null;
        }
        return user;
      } catch (err) {
        console.error("Error in user query:", err);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch if data is fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });

  // Get session
  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      try {
        // First, check if we have a token in cookies (client-side fallback)
        // Set session non-blocking to prevent hanging
        if (typeof window !== "undefined") {
          const cookieToken = clientTokenManager.getAccessToken();
          if (cookieToken && !clientTokenManager.isTokenExpired()) {
            // Token exists in cookies, try to set session in Supabase client first (non-blocking)
            const refreshToken = clientTokenManager.getRefreshToken();
            if (refreshToken) {
              supabase.auth
                .setSession({
                  access_token: cookieToken,
                  refresh_token: refreshToken,
                })
                .catch((setSessionErr) => {
                  console.warn(
                    "Failed to set session from cookies:",
                    setSessionErr
                  );
                });
            }
          }
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // If no session, check cookies as fallback
        if (!session) {
          if (typeof window !== "undefined") {
            const cookieToken = clientTokenManager.getAccessToken();
            if (cookieToken && !clientTokenManager.isTokenExpired()) {
              // We have a valid token in cookies, try to refresh to get full session
              try {
                const refreshResponse = await fetch("/api/auth/refresh", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                });
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  if (refreshData.session) {
                    // Set session non-blocking
                    supabase.auth
                      .setSession({
                        access_token: refreshData.session.access_token,
                        refresh_token: refreshData.session.refresh_token,
                      })
                      .catch(() => {});
                    return refreshData.session;
                  }
                }
              } catch (refreshErr) {
                console.error("Refresh failed in session query:", refreshErr);
              }
            }
          }
          return null;
        }

        if (error) {
          // If token is expired or invalid, try to refresh via API
          if (
            error.message?.includes("expired") ||
            error.message?.includes("invalid") ||
            error.message?.includes("JWT")
          ) {
            // Try to refresh using API (which updates cookies)
            try {
              const refreshResponse = await fetch("/api/auth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.session) {
                  console.log(
                    "refreshData.session before setSession",
                    refreshData.session
                  );
                  // Don't await - set session non-blocking to prevent hanging
                  supabase.auth
                    .setSession({
                      access_token: refreshData.session.access_token,
                      refresh_token: refreshData.session.refresh_token,
                    })
                    .catch((err) => {
                      console.error("Error setting refreshed session:", err);
                    });
                  return refreshData.session;
                }
              }
            } catch (refreshErr) {
              console.error("Refresh failed:", refreshErr);
              // Return null instead of signing out to prevent loops
              return null;
            }
          }
          // Return null if refresh failed or no refresh needed
          return null;
        }

        // Check if session exists and is not expired
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000; // Convert to milliseconds
          const now = Date.now();
          // If expired, try to refresh
          if (expiresAt <= now) {
            try {
              const refreshResponse = await fetch("/api/auth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.session) {
                  // Don't await - set session non-blocking to prevent hanging
                  supabase.auth
                    .setSession({
                      access_token: refreshData.session.access_token,
                      refresh_token: refreshData.session.refresh_token,
                    })
                    .catch((err) => {
                      console.error("Error setting refreshed session:", err);
                    });
                  return refreshData.session;
                }
              }
            } catch (refreshErr) {
              console.error("Refresh failed:", refreshErr);
              // Return null instead of throwing
              return null;
            }
          }
        }

        return session;
      } catch (err) {
        console.error("Error in session query:", err);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch if data is fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });

  useEffect(() => {
    setSession(sessionData || null);
  }, [sessionData]);

  // Listen for auth changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Update query data directly instead of invalidating (which triggers refetch)
        if (session) {
          queryClient.setQueryData(["auth", "session"], session);
          // Only set user if we don't have it yet
          const currentUser = queryClient.getQueryData(["auth", "user"]);
          if (!currentUser && session.user) {
            queryClient.setQueryData(["auth", "user"], session.user);
          }
        }
        // Navigate to dashboard if on auth page or landing page
        // Use window.location.replace for full page reload so middleware can read cookies
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname;
          if (pathname.startsWith("/auth") || pathname === "/") {
            window.location.replace("/dashboard");
          }
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        // Clear query data directly - don't invalidate to prevent refetch loops
        queryClient.setQueryData(["auth", "user"], null);
        queryClient.setQueryData(["auth", "session"], null);
        // Cancel any ongoing queries to prevent infinite loading
        queryClient.cancelQueries({ queryKey: ["auth"] });
        // Don't invalidate - just clear the data

        // Don't refetch - we're doing a full page reload anyway
        // Navigate to sign-in page
        // Use window.location.replace for full page reload so middleware can read cleared cookies
        if (typeof window !== "undefined") {
          window.location.replace("/auth/signin");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, router]);

  const refreshSession = useCallback(async () => {
    try {
      // Use API route to refresh and update cookies
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh session");
      }

      if (data.session) {
        // Update Supabase client session for client-side state (non-blocking)
        supabase.auth
          .setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          .catch((err) => {
            console.error("Error setting refreshed session:", err);
          });
        setSession(data.session);
        // Set query data directly instead of refetching
        queryClient.setQueryData(["auth", "session"], data.session);
        if (data.user) {
          queryClient.setQueryData(["auth", "user"], data.user);
        }
        // Don't invalidate - we've already updated the data
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      try {
        // Sign out from both API and client
        const signOutResponse = await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        });
        await supabase.auth.signOut();
        setSession(null);
        // Explicitly reset user and session queries to null
        queryClient.setQueryData(["auth", "user"], null);
        queryClient.setQueryData(["auth", "session"], null);
        // Cancel any ongoing queries to prevent infinite loading
        queryClient.cancelQueries({ queryKey: ["auth"] });
        // Don't invalidate - we're clearing data directly and doing a full page reload

        // Don't refetch - we're doing a full page reload anyway
        if (typeof window !== "undefined") {
          window.location.replace("/auth/signin");
        }
      } catch (signOutError) {
        console.error(
          "Error during sign out after refresh failure:",
          signOutError
        );
        // Even on error, try to navigate
        if (typeof window !== "undefined") {
          window.location.replace("/auth/signin");
        }
      }
    }
  }, [queryClient]);

  // Auto-refresh session before it expires
  useEffect(() => {
    // Don't auto-refresh if queries are still loading
    if (sessionLoading || userLoading) {
      return;
    }

    if (!session?.expires_at) {
      return;
    }

    // expires_at is in seconds (Unix timestamp), Date.now() is in milliseconds
    const expiresIn = session.expires_at * 1000 - Date.now();
    const refreshTime = expiresIn - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      // Schedule refresh before expiry
      const timeout = setTimeout(async () => {
        try {
          await refreshSession();
        } catch (error) {
          // If refresh fails, session will be cleared by refreshSession
          console.error("Auto-refresh failed:", error);
        }
      }, refreshTime);

      return () => clearTimeout(timeout);
    } else if (expiresIn > -5 * 60 * 1000) {
      // If token is already expired or about to expire (within 5 minutes), refresh immediately
      // But only if not too far expired (more than 5 minutes means it's likely invalid)
      refreshSession().catch((error) => {
        console.error("Immediate refresh failed:", error);
      });
    } else {
      // Token is too far expired, sign out
      supabase.auth.signOut().catch(() => {
        // Ignore errors
      });
    }
  }, [session, refreshSession, sessionLoading, userLoading]);

  const signInMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      // Use API route to ensure cookies are set
      console.log("payload", payload);
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include", // Ensure cookies are included and set
      });
      console.log("response", response);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in");
      }
      // Also set session in Supabase client for client-side state
      // First, ensure cookies are set via clientTokenManager (client-side fallback)
      if (data.session && typeof window !== "undefined") {
        try {
          // Always set cookies first as fallback
          clientTokenManager.setTokens({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            user_id: data.session.user?.id ?? undefined,
          });
          console.log("Tokens set in cookies via clientTokenManager");
        } catch (cookieErr) {
          console.error(
            "Failed to set cookies via clientTokenManager:",
            cookieErr
          );
        }

        // Then try to set session in Supabase client (non-blocking)
        // Don't await - let it happen in background, cookies are already set
        supabase.auth
          .setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          .then((result) => {
            console.log("setSession result:", result);
            if (result.error) {
              console.error("setSession error:", result.error);
            } else {
              console.log("setSession successful:", result.data);
            }
          })
          .catch((err) => {
            console.error("setSession exception:", err);
          });
      }
      console.log("dataaaaa", data);
      return {
        user: data.user,
        session: data.session,
        redirectTo: data.redirectTo,
      };
    },
    onSuccess: async (data) => {
      console.log("data onSuccess", data);

      // Don't refetch queries here - we're doing a full page reload anyway
      // The queries will run fresh on the next page load
      // Just invalidate to clear any stale data
      queryClient.setQueryData(["auth", "user"], data.user);
      queryClient.setQueryData(["auth", "session"], data.session);
      // Don't invalidate - we've already updated the data

      // Small delay to ensure cookies are processed
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Use window.location.replace for full page reload so middleware can read cookies
      // This ensures SSR (middleware) sees the new cookies immediately
      // Check for redirect query param from URL (set by middleware) or use response redirectTo
      let target = data?.redirectTo || "/dashboard";
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get("redirect");
        if (redirectParam) {
          target = redirectParam;
        }
        window.location.replace(target);
      }
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      name?: string;
    }) => {
      // Use API route to ensure cookies are set
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include", // Ensure cookies are included and set
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sign up");
      }
      // Also set session in Supabase client for client-side state
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }
      return { user: data.user, session: data.session };
    },
    onSuccess: async (data) => {
      // Don't refetch - we're doing a full page reload anyway
      // Just update the data if we have it
      queryClient.setQueryData(["auth", "user"], data.user);
      queryClient.setQueryData(["auth", "session"], data.session);
      // Don't invalidate - we've already updated the data
      // If session exists (auto-confirmed), navigate to dashboard
      // Use window.location.replace for full page reload so middleware can read cookies
      if (data?.session && typeof window !== "undefined") {
        window.location.replace("/dashboard");
      }
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      // First, clear client-side state (localStorage, Supabase client)
      if (typeof window !== "undefined") {
        // Clear all Supabase-related localStorage items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key === "supabase.auth.token")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }

      // Sign out from Supabase client (this also clears some localStorage)
      try {
        await supabase.auth.signOut();
      } catch (err) {
        // Continue even if signOut errors
        console.warn("Supabase client signOut error (ignored):", err);
      }

      // Call server to clear cookies, but do not throw if it fails
      try {
        const token = session?.access_token;
        const response = await fetch("/api/auth/signout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include", // Ensure cookies are included and cleared
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn("Server signout non-ok:", data);
        }
      } catch (err) {
        console.warn("Error calling /api/auth/signout (ignored):", err);
      }

      return true;
    },
    onSuccess: async () => {
      // Clear React Query cache
      setSession(null);
      // Explicitly reset user and session queries to null
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.setQueryData(["auth", "session"], null);
      // Cancel any ongoing queries to prevent infinite loading
      queryClient.cancelQueries({ queryKey: ["auth"] });
      // Don't invalidate - we're clearing data directly and doing a full page reload

      // Don't refetch - we're doing a full page reload anyway
      // Small delay to ensure cookies are cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Always navigate to sign-in page
      // Use window.location.replace for full page reload so middleware can read cleared cookies
      if (typeof window !== "undefined") {
        window.location.replace("/auth/signin");
      }
    },
    onError: async (err) => {
      // On error, still attempt navigation to signin so user isn't locked out
      console.error("Sign out failed:", err);
      // Clear state even on error
      setSession(null);
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.setQueryData(["auth", "session"], null);
      // Cancel any ongoing queries
      queryClient.cancelQueries({ queryKey: ["auth"] });
      // Don't invalidate - we're clearing data directly and doing a full page reload

      // Small delay to ensure state is cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use window.location.replace for full page reload
      if (typeof window !== "undefined") {
        window.location.replace("/auth/signin");
      }
    },
  });

  // Determine loading state - only loading if queries are actually loading
  // React Query's isLoading is true only when loading AND no data exists
  // Once a query resolves (with data or error), isLoading becomes false
  // So we check if either query is still loading
  // Also check if we have resolved data (even if null) - if so, we're not loading
  const hasResolved =
    (user !== undefined || userError) &&
    (sessionData !== undefined || sessionError);
  const isLoading = (userLoading || sessionLoading) && !hasResolved;

  // Debug logging
  if (typeof window !== "undefined" && (userLoading || sessionLoading)) {
    console.log("Auth loading state:", {
      userLoading,
      sessionLoading,
      hasResolved,
      user: user !== undefined ? "defined" : "undefined",
      sessionData: sessionData !== undefined ? "defined" : "undefined",
      userError: !!userError,
      sessionError: !!sessionError,
    });
  }

  // User is authenticated only if we have both user and valid session
  // Session is valid if it exists and is not expired
  const isSessionValid = session?.expires_at
    ? session.expires_at * 1000 > Date.now()
    : !!session;
  const isAuthenticated = !!user && !!session && isSessionValid;

  const value: AuthContextType = {
    user: user || null,
    session: session,
    isLoading,
    isAuthenticated,
    signIn: async (email: string, password: string) => {
      await signInMutation.mutateAsync({ email, password });
    },
    signUp: async (email: string, password: string, name?: string) => {
      return await signUpMutation.mutateAsync({ email, password, name });
    },
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
