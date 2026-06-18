import type { SupabaseClient } from "@supabase/supabase-js";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { assertCallerIsThreadMember } from "@/lib/peer-chat/peer-public-profile";
import { isMessageReadByPeer } from "@/lib/peer-chat/peer-read-receipt";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import { isPendingPeerMessageId } from "@/lib/peer-chat/optimistic-peer-message";
import { shouldShowPeerMessageTime } from "@/lib/peer-chat/message-time-visibility";
import type { Database } from "@/types/database";

export type GroupReadCursor = {
  userId: string;
  lastReadAt: string | null;
};

export async function markGroupThreadMemberRead(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; userId: string; readAt?: string },
): Promise<void> {
  if (!isGroupThreadId(input.threadId)) {
    return;
  }

  const now = input.readAt ?? new Date().toISOString();
  const { error } = await supabase
    .from("peer_thread_members")
    .update({ last_read_at: now })
    .eq("thread_id", input.threadId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }
}

export async function listGroupReadCursors(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; callerUserId: string },
): Promise<GroupReadCursor[]> {
  if (!isGroupThreadId(input.threadId)) {
    return [];
  }

  await assertCallerIsThreadMember(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const { data, error } = await supabase
    .from("peer_thread_members")
    .select("user_id, last_read_at")
    .eq("thread_id", input.threadId)
    .neq("user_id", input.callerUserId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    lastReadAt: (row.last_read_at as string | null | undefined) ?? null,
  }));
}

export function countGroupReadersForMessage(
  sentAt: string,
  readerCursors: readonly GroupReadCursor[],
): number {
  return readerCursors.filter((row) =>
    isMessageReadByPeer(sentAt, row.lastReadAt),
  ).length;
}

/** 카톡 단톡식 — 마지막 묶음 버블에 읽은 인원 수. */
export function groupReadCountForMessage(
  messages: readonly PeerMessage[],
  index: number,
  readerCursors: readonly GroupReadCursor[],
): number {
  const current = messages[index];
  if (!current || current.author !== "me") {
    return 0;
  }
  if (isPendingPeerMessageId(current.id)) {
    return 0;
  }
  if (!shouldShowPeerMessageTime(messages, index)) {
    return 0;
  }
  return countGroupReadersForMessage(current.sentAt, readerCursors);
}
