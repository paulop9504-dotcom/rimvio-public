"use client";

import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";

/** After remote bridge media merge — refresh globe reel + pin sheet. */
export function notifyBridgeSharedMediaUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
}
