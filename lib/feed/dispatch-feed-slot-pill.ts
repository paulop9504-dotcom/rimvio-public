import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { applyExecutionUri } from "@/lib/execution/adapters/apply-uri";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { CapabilityId } from "@/lib/capability-registry";

const FEED_LATER_DEEPLINK = "rimvio://feed/later";

export type FeedSlotPillHandlers = {
  onSpawnPrompt?: (uri: string) => void;
  onCapability?: (slot: FeedTodaySlot, capabilityId: CapabilityId) => void;
  onLater?: () => void;
};

export function dispatchFeedSlotPill(
  slot: FeedTodaySlot,
  pill: FeedSlotPill,
  handlers: FeedSlotPillHandlers,
): void {
  if (pill.kind === "capability") {
    handlers.onCapability?.(slot, pill.capabilityId);
    return;
  }

  if (pill.deeplink === FEED_LATER_DEEPLINK) {
    handlers.onLater?.();
    return;
  }

  if (pill.deeplink.trim()) {
    try {
      openSpawnAction({
        deeplink: pill.deeplink,
        onPrompt: handlers.onSpawnPrompt,
      });
    } catch {
      if (pill.fallbackDeeplink) {
        applyExecutionUri(pill.fallbackDeeplink, { sendPrompt: handlers.onSpawnPrompt });
      }
    }
    return;
  }

  if (pill.fallbackDeeplink) {
    applyExecutionUri(pill.fallbackDeeplink, { sendPrompt: handlers.onSpawnPrompt });
  }
}
