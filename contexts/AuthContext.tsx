"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
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
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        // If token is expired or invalid, clear session
        if (
          error.message?.includes("expired") ||
          error.message?.includes("invalid") ||
          error.message?.includes("JWT")
        ) {
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            // Ignore sign out errors
          }
        }
        // Return null instead of throwing to prevent infinite loading
        return null;
      }
      return user;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
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
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

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
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.session) {
                await supabase.auth.setSession(refreshData.session);
                return refreshData.session;
              }
            }
          } catch (refreshErr) {
            // Refresh failed, sign out
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              // Ignore sign out errors
            }
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
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.session) {
                await supabase.auth.setSession(refreshData.session);
                return refreshData.session;
              }
            }
          } catch (refreshErr) {
            // Refresh failed, return null
            return null;
          }
        }
      }

      return session;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
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
        await refetchUser();
        await refetchSession();
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        queryClient.clear();
        // Explicitly reset user and session queries
        queryClient.setQueryData(["auth", "user"], null);
        queryClient.setQueryData(["auth", "session"], null);
        await refetchUser();
        await refetchSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetchUser, refetchSession, queryClient]);

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
        // Update Supabase client session for client-side state
        await supabase.auth.setSession(data.session);
        setSession(data.session);
        await refetchUser();
        await refetchSession();
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      try {
        // Sign out from both API and client
        const signOutResponse = await fetch("/api/auth/signout", {
          method: "POST",
        });
        await supabase.auth.signOut();
        setSession(null);
        queryClient.clear();
        queryClient.setQueryData(["auth", "user"], null);
        queryClient.setQueryData(["auth", "session"], null);
        await refetchUser();
        await refetchSession();
      } catch (signOutError) {
        console.error(
          "Error during sign out after refresh failure:",
          signOutError
        );
      }
    }
  }, [refetchUser, refetchSession, queryClient]);

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
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in");
      }
      // Also set session in Supabase client for client-side state
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }
      return { user: data.user, session: data.session };
    },
    onSuccess: async () => {
      await refetchUser();
      await refetchSession();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
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
    onSuccess: async () => {
      await refetchUser();
      await refetchSession();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      // Use API route to ensure cookies are cleared
      const token = session?.access_token;
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign out");
      }
      // Also sign out from Supabase client
      await supabase.auth.signOut();
    },
    onSuccess: async () => {
      setSession(null);
      queryClient.clear();
      // Explicitly reset user and session queries
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.setQueryData(["auth", "session"], null);
      // Refetch to ensure state is cleared
      await refetchUser();
      await refetchSession();
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
      await signUpMutation.mutateAsync({ email, password, name });
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
