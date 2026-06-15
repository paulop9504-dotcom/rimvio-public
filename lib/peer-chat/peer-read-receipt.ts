import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import { isPendingPeerMessageId } from "@/lib/peer-chat/optimistic-peer-message";
import { shouldShowPeerMessageTime } from "@/lib/peer-chat/message-time-visibility";
import type { Database } from "@/types/database";

/** Pure — message sentAt is at or before peer read cursor. */
export function isMessageReadByPeer(
  sentAt: string,
  peerLastReadAt: string | null | undefined,
): boolean {
  if (!peerLastReadAt) {
    return false;
  }
  const sent = new Date(sentAt).getTime();
  const read = new Date(peerLastReadAt).getTime();
  if (!Number.isFinite(sent) || !Number.isFinite(read)) {
    return false;
  }
  return sent <= read;
}

/** Kakao-style — check on last bubble in cluster until peer reads. */
export function shouldShowPeerSentCheck(
  messages: readonly PeerMessage[],
  index: number,
  peerLastReadAt: string | null | undefined,
): boolean {
  const current = messages[index];
  if (!current || current.author !== "me") {
    return false;
  }
  if (isPendingPeerMessageId(current.id)) {
    return false;
  }
  if (!shouldShowPeerMessageTime(messages, index)) {
    return false;
  }
  return !isMessageReadByPeer(current.sentAt, peerLastReadAt);
}

export async function readPeerLastReadAt(
  supabase: SupabaseClient<Database>,
  input: { userId: string; threadId: string },
): Promise<string | null> {
  if (!isDmThreadId(input.threadId)) {
    return null;
  }
  const friendId = extractOtherUserIdFromDmThread(input.threadId, input.userId);
  if (!friendId) {
    return null;
  }
  const { data, error } = await supabase
    .from("friend_connections")
    .select("peer_last_read_at")
    .eq("user_id", input.userId)
    .eq("friend_id", friendId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.peer_last_read_at as string | null | undefined) ?? null;
}

/** When viewer reads, bump sender's peer_last_read_at so their checks clear. */
export async function touchPeerReadReceiptForSender(
  supabase: SupabaseClient<Database>,
  input: { readerUserId: string; threadId: string; readAt?: string },
): Promise<void> {
  if (!isDmThreadId(input.threadId)) {
    return;
  }
  const friendId = extractOtherUserIdFromDmThread(
    input.threadId,
    input.readerUserId,
  );
  if (!friendId) {
    return;
  }
  const now = input.readAt ?? new Date().toISOString();
  await supabase
    .from("friend_connections")
    .update({
      peer_last_read_at: now,
      updated_at: now,
    })
    .eq("user_id", friendId)
    .eq("friend_id", input.readerUserId);
}
