import {
  connectPeerToHub,
  emptyPinnedRoster,
  ensureFiveHubSlots,
} from "@/lib/context/pinned-peer-roster";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  readPinnedRoster,
  writePinnedRoster,
  writePeerThreadSettings,
  defaultPeerThreadSettings,
} from "@/lib/context/peer-thread-settings-store";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";

export function applySocialLayerToLocalRoster(input: {
  pinned: SocialBubblePeer[];
  archive: SocialBubblePeer[];
}): void {
  let roster = emptyPinnedRoster();

  for (const peer of input.pinned) {
    if (peer.pinSlot === null || peer.pinSlot < 0 || peer.pinSlot > 4) {
      continue;
    }
    const result = connectPeerToHub({
      roster,
      peerThreadId: peer.threadId,
      displayName: peer.displayName,
      preferredSlotIndex: peer.pinSlot as PinnedSlotIndex,
    });
    roster = result.roster;
    writePeerThreadSettings({
      ...defaultPeerThreadSettings({
        peerThreadId: peer.threadId,
        displayName: peer.displayName,
      }),
      isPinned: true,
      aiLensEnabled: false,
      updatedAt: new Date().toISOString(),
    });
  }

  writePinnedRoster(ensureFiveHubSlots(roster));

  for (const peer of [...input.pinned, ...input.archive]) {
    addPeerContact({
      peerThreadId: peer.threadId,
      displayName: peer.displayName,
    });
    if (!peer.isPinned) {
      writePeerThreadSettings({
        ...defaultPeerThreadSettings({
          peerThreadId: peer.threadId,
          displayName: peer.displayName,
        }),
        isPinned: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

export function bubbleStateByThreadId(
  pinned: SocialBubblePeer[],
): Map<string, SocialBubblePeer["bubbleState"]> {
  const map = new Map<string, SocialBubblePeer["bubbleState"]>();
  for (const p of pinned) {
    map.set(p.threadId, p.bubbleState);
  }
  return map;
}

export function peerMetaByThreadId(
  peers: SocialBubblePeer[],
): Map<string, SocialBubblePeer> {
  return new Map(peers.map((p) => [p.threadId, p]));
}

/** Archive = unpinned only (not on hub). */
export function listArchivePeers(
  pinned: SocialBubblePeer[],
  archive: SocialBubblePeer[],
): SocialBubblePeer[] {
  const pinnedIds = new Set(pinned.map((p) => p.threadId));
  return archive.filter((p) => !pinnedIds.has(p.threadId));
}
