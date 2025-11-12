import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });
};

export const useSession = () => {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
  });
};

export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
};

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
