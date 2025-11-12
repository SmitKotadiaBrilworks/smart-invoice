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
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    retry: false,
  });

  // Get session
  const {
    data: sessionData,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    retry: false,
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
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        throw new Error("No session to refresh");
      }

      const {
        data: { session: newSession },
        error,
      } = await supabase.auth.refreshSession(currentSession);

      if (error) throw error;

      if (newSession) {
        setSession(newSession);
        await refetchUser();
        await refetchSession();
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      // If refresh fails, sign out directly
      try {
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
    if (!session?.expires_at) return;

    // expires_at is in seconds (Unix timestamp), Date.now() is in milliseconds
    const expiresIn = session.expires_at * 1000 - Date.now();
    const refreshTime = expiresIn - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      const timeout = setTimeout(async () => {
        await refreshSession();
      }, refreshTime);

      return () => clearTimeout(timeout);
    } else {
      // If token is already expired or about to expire, refresh immediately
      refreshSession();
    }
  }, [session, refreshSession]);

  const signInMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (error) throw error;
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
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            name: payload.name,
          },
        },
      });
      if (error) throw error;

      // Create user profile if user was created
      if (data.user) {
        try {
          await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email || payload.email,
            name: payload.name || null,
          });
        } catch (profileError: any) {
          // If profile already exists (from trigger), ignore the error
          if (!profileError.message?.includes("duplicate")) {
            console.error("Error creating user profile:", profileError);
          }
        }
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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

  const value: AuthContextType = {
    user: user || null,
    session: session,
    isLoading: userLoading || sessionLoading,
    isAuthenticated: !!user && !!session,
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
