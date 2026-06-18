/** Apple Watch–style relationship bubble presence. */
export type BubbleState = "idle" | "active" | "urgent";

export type SocialBubblePeer = {
  friendId: string;
  threadId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  bubbleState: BubbleState;
  isPinned: boolean;
  pinSlot: number | null;
  unreadCount: number;
  lastInteractionAt: string;
  messagesPurgeAfter: string | null;
};

const URGENT_UNREAD_MIN = 3;
const URGENT_RECENT_MS = 5 * 60 * 1000;

export function deriveBubbleState(input: {
  unreadCount: number;
  lastInboundAt: string | null;
  now?: number;
}): BubbleState {
  if (input.unreadCount <= 0) {
    return "idle";
  }
  const now = input.now ?? Date.now();
  if (input.unreadCount >= URGENT_UNREAD_MIN) {
    return "urgent";
  }
  if (input.lastInboundAt) {
    const age = now - new Date(input.lastInboundAt).getTime();
    if (age >= 0 && age <= URGENT_RECENT_MS) {
      return "urgent";
    }
  }
  return "active";
}

export const BUBBLE_RING_CLASS: Record<BubbleState, string> = {
  idle: "border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
  active: "border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.55),0_4px_14px_rgba(251,191,36,0.25)]",
  urgent:
    "border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.7),0_4px_18px_rgba(251,191,36,0.45)] animate-pulse",
};
