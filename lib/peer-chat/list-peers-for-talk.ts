import type { PeerContact } from "@/lib/context/peer-contact-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";

const MAX_LIST = 32;

/** 연락처 + ROOM 고정 친구 (중복 제거) */
export function listPeersForTalk(): PeerContact[] {
  const byId = new Map<string, PeerContact>();
  const now = new Date().toISOString();

  for (const contact of readPeerContacts()) {
    byId.set(contact.peerThreadId, { ...contact });
  }

  for (const slot of readPinnedRoster().slots) {
    if (
      slot.connection !== "connected" ||
      !slot.peerThreadId ||
      !slot.displayName?.trim()
    ) {
      continue;
    }
    const existing = byId.get(slot.peerThreadId);
    const roomLabel = slot.displayName.trim();
    byId.set(slot.peerThreadId, {
      peerThreadId: slot.peerThreadId,
      displayName: existing?.displayName ?? roomLabel,
      roomDisplayName: roomLabel,
      profileDisplayName: existing?.profileDisplayName ?? null,
      rimvioId: existing?.rimvioId ?? null,
      emailLower: existing?.emailLower ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: existing?.updatedAt ?? now,
    });
  }

  return [...byId.values()].slice(0, MAX_LIST);
}
