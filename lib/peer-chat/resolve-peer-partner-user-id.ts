"use client";

import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/dm-thread";
import { fetchPeerThreadMembers } from "@/lib/peer-chat/peer-chat-client";

/** 1:1 thread — the other member's Supabase user id. */
export async function resolvePeerPartnerUserId(
  peerThreadId: string,
  callerUserId?: string | null,
): Promise<string | null> {
  const threadId = peerThreadId.trim();
  if (!threadId) {
    return null;
  }

  const caller = callerUserId?.trim();
  if (caller && isDmThreadId(threadId)) {
    const fromThread = extractOtherUserIdFromDmThread(threadId, caller);
    if (fromThread) {
      return fromThread;
    }
  }

  try {
    const members = await fetchPeerThreadMembers(threadId);
    const partner = members.find((row) => !row.isSelf);
    return partner?.userId?.trim() ?? null;
  } catch {
    return null;
  }
}
