import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type CompleteDmFriendAddResult = {
  threadId: string;
  displayName: string;
  otherUserId: string;
};

function parseCompleteDmFriendAdd(raw: unknown): CompleteDmFriendAddResult | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const threadId = row.thread_id;
  const otherUserId = row.other_user_id;
  if (typeof threadId !== "string" || !threadId) {
    return null;
  }
  if (typeof otherUserId !== "string" || !otherUserId) {
    return null;
  }
  return {
    threadId,
    otherUserId,
    displayName:
      typeof row.display_name === "string" ? row.display_name : "친구",
  };
}

/** Thread + members + friend_connections + feed slots in one security-definer RPC. */
export async function completeDmFriendAdd(
  supabase: SupabaseClient<Database>,
  input: { otherUserId: string; friendDisplayName?: string | null },
): Promise<CompleteDmFriendAddResult> {
  const { data, error } = await supabase.rpc("complete_dm_friend_add", {
    p_other_user_id: input.otherUserId,
    p_friend_display_name: input.friendDisplayName?.trim() || null,
  });
  if (error) {
    throw error;
  }
  const parsed = parseCompleteDmFriendAdd(data);
  if (!parsed) {
    throw new Error("친구 추가 응답을 처리하지 못했어요.");
  }
  return parsed;
}

export async function ensureDmThreadPartnerMember(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; partnerUserId: string },
): Promise<void> {
  const { error } = await supabase.rpc("ensure_dm_thread_partner_member", {
    p_thread_id: input.threadId,
    p_partner_user_id: input.partnerUserId,
  });
  if (error) {
    throw error;
  }
}

export async function ensureReciprocalFriendConnection(
  supabase: SupabaseClient<Database>,
  input: {
    friendId: string;
    threadId: string;
    bumpInteraction?: boolean;
  },
): Promise<void> {
  const { error } = await supabase.rpc("ensure_reciprocal_friend_connection", {
    p_friend_id: input.friendId,
    p_thread_id: input.threadId,
    p_bump_interaction: input.bumpInteraction ?? true,
  });
  if (error) {
    throw error;
  }
}
