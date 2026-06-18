import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import type { Database } from "@/types/database";

/** DM thread ids encode both user ids — allow without peer_thread_members row. */
export function isDmThreadParticipantById(
  threadId: string,
  callerUserId: string,
): boolean {
  return extractOtherUserIdFromDmThread(threadId, callerUserId) !== null;
}

export async function callerCanAccessPeerThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
  callerUserId: string,
): Promise<boolean> {
  const key = threadId.trim();
  const caller = callerUserId.trim();
  if (!key || !caller) {
    return false;
  }

  if (isDmThreadId(key) && isDmThreadParticipantById(key, caller)) {
    return true;
  }

  const { data, error } = await supabase
    .from("peer_thread_members")
    .select("user_id")
    .eq("thread_id", key)
    .eq("user_id", caller)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function assertCallerCanAccessPeerThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
  callerUserId: string,
): Promise<void> {
  const allowed = await callerCanAccessPeerThread(
    supabase,
    threadId,
    callerUserId,
  );
  if (!allowed) {
    throw new Error("forbidden:이 대화방에 참여 중이 아니에요.");
  }
}
