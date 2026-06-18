import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import type { Database } from "@/types/database";

export type PeerPublicProfile = {
  userId: string;
  displayName: string | null;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
};

export function parsePublicProfileRow(raw: unknown): PeerPublicProfile | null {
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
  };
}

export async function fetchPeerPublicProfileByUserId(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PeerPublicProfile | null> {
  const { data, error } = await supabase.rpc("get_peer_public_profile", {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  return parsePublicProfileRow(data);
}

export async function assertCallerIsThreadMember(
  supabase: SupabaseClient<Database>,
  threadId: string,
  callerUserId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("peer_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
    .eq("user_id", callerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("forbidden:이 대화방에 참여 중이 아니에요.");
  }
}

export async function assertCallerIsDmThreadMember(
  supabase: SupabaseClient<Database>,
  threadId: string,
  callerUserId: string,
): Promise<void> {
  await assertCallerIsThreadMember(supabase, threadId, callerUserId);
}

export async function readDmPeerPublicProfile(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; callerUserId: string },
): Promise<PeerPublicProfile | null> {
  if (!isDmThreadId(input.threadId)) {
    return null;
  }

  await assertCallerIsDmThreadMember(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const otherUserId = extractOtherUserIdFromDmThread(
    input.threadId,
    input.callerUserId,
  );
  if (!otherUserId) {
    return null;
  }

  return fetchPeerPublicProfileByUserId(supabase, otherUserId);
}
