import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFriendAddPreviewProfile } from "@/lib/peer-chat/friend-add-preview-profile";
import { parsePublicProfileRow } from "@/lib/peer-chat/peer-public-profile";
import type { Database } from "@/types/database";

export type FriendProfileFields = {
  display_name: string | null;
  rimvio_id: string | null;
  avatar_url: string | null;
};

/** 친구 프로필 — RLS 우회 RPC (DM 상대 · 친추 미리보기 fallback) */
export async function loadFriendProfilesMap(
  supabase: SupabaseClient<Database>,
  friendIds: string[],
): Promise<Map<string, FriendProfileFields>> {
  const map = new Map<string, FriendProfileFields>();
  const unique = [...new Set(friendIds.filter(Boolean))];

  await Promise.all(
    unique.map(async (friendId) => {
      try {
        const { data, error } = await supabase.rpc("get_peer_public_profile", {
          p_target_user_id: friendId,
        });
        if (!error) {
          const parsed = parsePublicProfileRow(data);
          if (parsed) {
            map.set(friendId, {
              display_name: parsed.displayName,
              rimvio_id: parsed.rimvioId,
              avatar_url: parsed.avatarUrl,
            });
            return;
          }
        }
      } catch {
        /* try preview */
      }

      try {
        const preview = await fetchFriendAddPreviewProfile(supabase, friendId);
        if (preview) {
          map.set(friendId, {
            display_name: preview.displayName,
            rimvio_id: preview.rimvioId,
            avatar_url: preview.avatarUrl,
          });
        }
      } catch {
        /* no profile */
      }
    }),
  );

  return map;
}
