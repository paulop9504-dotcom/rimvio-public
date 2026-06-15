import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import type { PinnedPeerRoster } from "@/lib/context/peer-thread-types";
import {
  buildArchiveChatRows,
  type ArchiveChatRow,
} from "@/lib/social/archive-chat-rows";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";

function contactToSocialPeer(
  contact: PeerContact,
  roster: PinnedPeerRoster,
): SocialBubblePeer {
  const slot = findSlotByPeerId(roster, contact.peerThreadId);
  const isPinned = slot?.connection === "connected";
  return {
    friendId: contact.peerThreadId,
    threadId: contact.peerThreadId,
    displayName:
      contact.profileDisplayName?.trim() ||
      contact.roomDisplayName?.trim() ||
      contact.displayName,
    rimvioId: contact.rimvioId ?? null,
    avatarUrl: null,
    bubbleState: "idle",
    isPinned,
    pinSlot:
      isPinned && slot?.slotIndex !== undefined ? slot.slotIndex : null,
    unreadCount: 0,
    lastInteractionAt: contact.updatedAt,
    messagesPurgeAfter: null,
  };
}

function rosterSlotToSocialPeer(
  roster: PinnedPeerRoster,
  slotIndex: number,
): SocialBubblePeer | null {
  const slot = roster.slots[slotIndex];
  if (slot?.connection !== "connected" || !slot.peerThreadId) {
    return null;
  }
  return {
    friendId: slot.peerThreadId,
    threadId: slot.peerThreadId,
    displayName: slot.displayName?.trim() || "친구",
    rimvioId: null,
    avatarUrl: null,
    bubbleState: "idle",
    isPinned: true,
    pinSlot: slotIndex,
    unreadCount: 0,
    lastInteractionAt: new Date().toISOString(),
    messagesPurgeAfter: null,
  };
}

/** Social layer + local contacts + pinned roster — peers home list SSOT. */
export function mergePeersHomeSocialLayer(input: {
  pinned: readonly SocialBubblePeer[];
  archive: readonly SocialBubblePeer[];
  contacts?: readonly PeerContact[];
  roster: PinnedPeerRoster;
}): SocialBubblePeer[] {
  const contacts = input.contacts ?? readPeerContacts();
  const byThread = new Map<string, SocialBubblePeer>();

  for (const peer of [...input.pinned, ...input.archive]) {
    byThread.set(peer.threadId, peer);
  }

  for (const contact of contacts) {
    if (byThread.has(contact.peerThreadId)) {
      continue;
    }
    byThread.set(
      contact.peerThreadId,
      contactToSocialPeer(contact, input.roster),
    );
  }

  for (let i = 0; i < input.roster.slots.length; i += 1) {
    const fromSlot = rosterSlotToSocialPeer(input.roster, i);
    if (!fromSlot) {
      continue;
    }
    const existing = byThread.get(fromSlot.threadId);
    if (existing) {
      byThread.set(fromSlot.threadId, {
        ...existing,
        isPinned: true,
        pinSlot: fromSlot.pinSlot,
        displayName: existing.displayName || fromSlot.displayName,
      });
      continue;
    }
    byThread.set(fromSlot.threadId, fromSlot);
  }

  return [...byThread.values()];
}

export function buildPeersHomeRows(input: {
  pinned: readonly SocialBubblePeer[];
  archive: readonly SocialBubblePeer[];
  contacts?: readonly PeerContact[];
  roster: PinnedPeerRoster;
  feedSlots: readonly RelationshipFeedSlot[];
}): ArchiveChatRow[] {
  const peers = mergePeersHomeSocialLayer(input);
  return buildArchiveChatRows(peers, input.feedSlots);
}

export type { ArchiveChatRow };
