"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_NEXT_COOKIE,
  getAuthCallbackUrl,
} from "@/lib/auth/redirect-url";
import { isSupabaseConfigured, tryCreateClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (configured ? tryCreateClient() : null),
    [configured]
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(
    async (nextPath = "/onboarding") => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
      if (typeof document !== "undefined") {
        const secure = window.location.protocol === "https:";
        document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, configured, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
