import type { BubbleState } from "@/lib/social/bubble-state";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { deriveBubbleState } from "@/lib/social/bubble-state";

export function deriveArchiveBagState(
  archive: SocialBubblePeer[],
): BubbleState {
  let state: BubbleState = "idle";
  for (const peer of archive) {
    const peerState = deriveBubbleState({
      unreadCount: peer.unreadCount,
      lastInboundAt: null,
    });
    if (peerState === "urgent") {
      return "urgent";
    }
    if (peerState === "active") {
      state = "active";
    }
  }
  return state;
}

export function totalArchiveUnread(archive: SocialBubblePeer[]): number {
  return archive.reduce((sum, p) => sum + p.unreadCount, 0);
}
