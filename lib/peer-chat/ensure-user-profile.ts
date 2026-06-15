import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** ROOM 없이 Google 가입만 해도 user_profiles 행을 만듭니다. */
export async function ensureRimvioUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("rimvio_ensure_user_profile", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}
