import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";

export type ArchiveChatRow = SocialBubblePeer & {
  lastMessage: string | null;
  lastActivityAt: string;
};

/** Unread first, then recency — Kakao-style chat list order. */
export function sortArchivePeersForChat<T extends Pick<
  SocialBubblePeer,
  "unreadCount" | "lastInteractionAt"
> & { lastActivityAt?: string }>(
  peers: readonly T[],
): T[] {
  return [...peers].sort((a, b) => {
    const aUnread = a.unreadCount > 0 ? 1 : 0;
    const bUnread = b.unreadCount > 0 ? 1 : 0;
    if (bUnread !== aUnread) {
      return bUnread - aUnread;
    }
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aAt = new Date(a.lastActivityAt ?? a.lastInteractionAt).getTime();
    const bAt = new Date(b.lastActivityAt ?? b.lastInteractionAt).getTime();
    return bAt - aAt;
  });
}

export function buildArchiveChatRows(
  peers: readonly SocialBubblePeer[],
  slots: readonly RelationshipFeedSlot[],
): ArchiveChatRow[] {
  const slotByRoom = new Map(slots.map((slot) => [slot.roomId, slot]));
  const rows: ArchiveChatRow[] = peers.map((peer) => {
    const slot = slotByRoom.get(peer.threadId);
    return {
      ...peer,
      lastMessage: slot?.lastMessage ?? null,
      lastActivityAt: slot?.lastActivityAt ?? peer.lastInteractionAt,
    };
  });
  return sortArchivePeersForChat(rows);
}
