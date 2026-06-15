import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
  readUserProfile,
} from "@/lib/peer-chat/server-peer-chat";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import type { Database } from "@/types/database";

function contactMatchesPeer(
  contact: Pick<PeerContact, "peerThreadId" | "displayName" | "rimvioId">,
  peer: Pick<SocialBubblePeer, "threadId" | "displayName" | "rimvioId">,
): boolean {
  if (contact.peerThreadId === peer.threadId) {
    return true;
  }
  if (
    contact.displayName.trim() &&
    peer.displayName.trim() &&
    peerDisplayNamesMatch(peer.displayName, contact.displayName)
  ) {
    return true;
  }
  const rim = contact.rimvioId?.trim().toLowerCase();
  const peerRim = peer.rimvioId?.trim().toLowerCase();
  return Boolean(rim && peerRim && rim === peerRim);
}

/** Client: map local/roster thread id → cloud DM thread id from friend graph. */
export function resolveCanonicalPeerThreadFromSocialLayer(
  contact: Pick<PeerContact, "peerThreadId" | "displayName" | "rimvioId">,
  layer: { pinned: SocialBubblePeer[]; archive: SocialBubblePeer[] },
): string {
  const raw = contact.peerThreadId.trim();
  if (isDmThreadId(raw) && raw.includes("__")) {
    return raw;
  }

  const peers = [...layer.pinned, ...layer.archive];
  const hit = peers.find((peer) => contactMatchesPeer(contact, peer));
  if (hit?.threadId && isDmThreadId(hit.threadId)) {
    return hit.threadId;
  }

  return raw;
}

/** Server: resolve legacy/local thread ids before ensure + insert. */
export async function resolvePeerThreadIdForSend(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    threadId: string;
    displayName?: string | null;
  },
): Promise<string> {
  const threadId = input.threadId.trim();
  if (!threadId) {
    return threadId;
  }

  if (isGroupThreadId(threadId)) {
    return threadId;
  }

  if (isDmThreadId(threadId) && extractOtherUserIdFromDmThread(threadId, input.userId)) {
    return threadId;
  }

  const { data: exact } = await supabase
    .from("friend_connections")
    .select("thread_id")
    .eq("user_id", input.userId)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (exact?.thread_id && isDmThreadId(exact.thread_id as string)) {
    return exact.thread_id as string;
  }

  const { data: rows, error } = await supabase
    .from("friend_connections")
    .select("thread_id, friend_id")
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }

  const dmRows = (rows ?? []).filter((row) =>
    isDmThreadId((row.thread_id as string) ?? ""),
  );

  const queryLabel = input.displayName?.trim() ?? "";

  if (queryLabel) {
    for (const row of dmRows) {
      const friendId = row.friend_id as string;
      const profile = await readUserProfile(supabase, friendId);
      const labels = [
        profile?.display_name,
        profile?.rimvio_id,
        profile?.email_lower?.split("@")[0],
      ].filter((value): value is string => Boolean(value?.trim()));

      if (labels.some((label) => peerDisplayNamesMatch(label, queryLabel))) {
        return row.thread_id as string;
      }
    }

    for (const row of dmRows) {
      const { data: threadRow } = await supabase
        .from("peer_threads")
        .select("display_name")
        .eq("id", row.thread_id as string)
        .maybeSingle();
      const roomLabel = (threadRow?.display_name as string | null)?.trim();
      if (roomLabel && peerDisplayNamesMatch(roomLabel, queryLabel)) {
        return row.thread_id as string;
      }
    }
  }

  if (dmRows.length === 1) {
    return dmRows[0]!.thread_id as string;
  }

  return threadId;
}
