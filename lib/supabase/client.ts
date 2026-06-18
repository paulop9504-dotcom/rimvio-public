import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import {
  RIMVIO_SUPABASE_ANON_KEY,
  RIMVIO_SUPABASE_URL,
} from "@/lib/supabase/rimvio-supabase-public";

/** Browser client always uses baked-in public credentials (never Vercel-inlined env). */
export function createClient() {
  return createBrowserClient<Database>(
    RIMVIO_SUPABASE_URL,
    RIMVIO_SUPABASE_ANON_KEY,
    {
      auth: {
        // Only `/auth/callback` exchanges the PKCE code (avoid double exchange).
        detectSessionInUrl: false,
      },
    },
  );
}

export function isSupabaseConfigured() {
  return Boolean(RIMVIO_SUPABASE_URL && RIMVIO_SUPABASE_ANON_KEY);
}

export function tryCreateClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient();
}
