"use client";

import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";

/** After remote bridge media merge — refresh globe reel + pin sheet + background sync. */
export function notifyBridgeSharedMediaUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
  window.dispatchEvent(new CustomEvent(EXPERIENCE_BRIDGE_UPDATED));
}
