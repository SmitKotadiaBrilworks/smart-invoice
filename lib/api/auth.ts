import { supabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: string;
}

export const authApi = {
  signUp: async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    return { user: data.user, session: data.session, error: error?.message };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data.user, session: data.session, error: error?.message };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message };
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error: error?.message };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error: error?.message };
  },
};
