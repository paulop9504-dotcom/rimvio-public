import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { FeedSlotPeerLookup } from "@/lib/feed/feed-slot-peer-context-types";
import type { GlobePinPeer } from "@/lib/globe/globe-pin-peer-types";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { resolveGlobePinPeers } from "@/lib/globe/project-globe-pin-peers";

const MAX_SHARED = 3;

/** Bridge invitees — shown on pin card top-right after share. */
export function readGlobePinSharedWithFromBridge(
  eventId: string,
  lookup?: FeedSlotPeerLookup | null,
): GlobePinPeer[] {
  const state = readLocalBridgeState(eventId);
  if (!state) {
    return [];
  }

  const seeds = state.participants
    .filter(
      (row) =>
        row.role !== "host" &&
        row.status !== "declined" &&
        row.status !== "left" &&
        row.status !== "removed",
    )
    .map((row) => ({
      displayName: row.displayName.trim() || "친구",
      peerThreadId: `bridge:${row.userId}`,
    }));

  return resolveGlobePinPeers(seeds, lookup).slice(0, MAX_SHARED);
}

export function enrichClassifiedGlobePinSharedWith(
  pins: readonly ClassifiedGlobePin[],
  lookup?: FeedSlotPeerLookup | null,
): ClassifiedGlobePin[] {
  return pins.map((pin) => {
    const eventId = pin.sourceEventId?.trim();
    if (!eventId || pin.pinShape === "cluster" || pin.pinShape === "viewer") {
      return pin;
    }
    const sharedWith = readGlobePinSharedWithFromBridge(eventId, lookup);
    if (sharedWith.length === 0) {
      return pin;
    }
    return { ...pin, sharedWith };
  });
}
