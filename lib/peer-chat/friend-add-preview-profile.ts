import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type FriendAddPreviewProfile = {
  userId: string;
  displayName: string | null;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
  phoneE164: string | null;
};

function parseFriendAddPreviewRow(raw: unknown): FriendAddPreviewProfile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const userId = row.user_id;
  if (typeof userId !== "string" || !userId) {
    return null;
  }
  return {
    userId,
    displayName:
      typeof row.display_name === "string" ? row.display_name : null,
    rimvioId: typeof row.rimvio_id === "string" ? row.rimvio_id : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    emailLower:
      typeof row.email_lower === "string" ? row.email_lower : null,
    phoneE164:
      typeof row.phone_e164 === "string" ? row.phone_e164 : null,
  };
}

export async function fetchFriendAddPreviewProfile(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<FriendAddPreviewProfile | null> {
  const { data, error } = await supabase.rpc("get_friend_add_preview_profile", {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  return parseFriendAddPreviewRow(data);
}
