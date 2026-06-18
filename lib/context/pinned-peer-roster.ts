import {
  daysUntilPurge,
  isPurgeDue,
  purgeAfterIso,
} from "@/lib/context/hub-room-retention";
import { resolveHubRoomKind } from "@/lib/peer-chat/resolve-hub-room-kind";
import { purgePeerThreadData } from "@/lib/context/purge-peer-thread-data";
import {
  PINNED_PEER_SLOTS,
  type HubRoomConnection,
  type HubRoomSlot,
  type PinnedPeerRoster,
  type PinnedSlotIndex,
} from "@/lib/context/peer-thread-types";

function vacantSlot(slotIndex: PinnedSlotIndex): HubRoomSlot {
  return { slotIndex, connection: "vacant" };
}

export function emptyPinnedRoster(): PinnedPeerRoster {
  return {
    slots: Array.from({ length: PINNED_PEER_SLOTS }, (_, i) =>
      vacantSlot(i as PinnedSlotIndex)
    ),
  };
}

export function ensureFiveHubSlots(roster: PinnedPeerRoster): PinnedPeerRoster {
  const byIndex = new Map(roster.slots.map((s) => [s.slotIndex, s]));
  const slots: HubRoomSlot[] = [];
  for (let i = 0; i < PINNED_PEER_SLOTS; i++) {
    const idx = i as PinnedSlotIndex;
    slots.push(byIndex.get(idx) ?? vacantSlot(idx));
  }
  return { slots };
}

function migrateLegacySlot(raw: HubRoomSlot): HubRoomSlot {
  if (raw.connection) {
    return raw;
  }
  const legacy = raw as HubRoomSlot & {
    peerThreadId: string;
    displayName: string;
    pinnedAt: string;
  };
  if (legacy.peerThreadId && legacy.displayName) {
    return {
      slotIndex: legacy.slotIndex,
      connection: "connected",
      peerThreadId: legacy.peerThreadId,
      displayName: legacy.displayName,
      roomKind: resolveHubRoomKind(legacy.peerThreadId),
      pinnedAt: legacy.pinnedAt ?? new Date().toISOString(),
    };
  }
  return vacantSlot(legacy.slotIndex);
}

/** Write path — drop expired unpinned peers; ROOM slots stay. */
export function purgeExpiredHubSlots(roster: PinnedPeerRoster): PinnedPeerRoster {
  let changed = false;
  const slots = roster.slots.map((slot) => {
    if (
      slot.connection === "purge_pending" &&
      slot.purgeAfter &&
      slot.peerThreadId &&
      isPurgeDue(slot.purgeAfter)
    ) {
      purgePeerThreadData(slot.peerThreadId);
      changed = true;
      return vacantSlot(slot.slotIndex);
    }
    return slot;
  });
  return changed ? { slots } : roster;
}

export function normalizePinnedRoster(raw: PinnedPeerRoster): PinnedPeerRoster {
  const migrated = {
    slots: (raw.slots ?? []).map(migrateLegacySlot),
  };
  return purgeExpiredHubSlots(ensureFiveHubSlots(migrated));
}

export function findHubSlot(
  roster: PinnedPeerRoster,
  slotIndex: PinnedSlotIndex
): HubRoomSlot {
  return (
    roster.slots.find((s) => s.slotIndex === slotIndex) ??
    vacantSlot(slotIndex)
  );
}

export function hubSlotAt(
  roster: PinnedPeerRoster,
  slotIndex: PinnedSlotIndex
): HubRoomSlot | undefined {
  return roster.slots.find((s) => s.slotIndex === slotIndex);
}

export function findSlotByPeerId(
  roster: PinnedPeerRoster,
  peerThreadId: string
): HubRoomSlot | undefined {
  return roster.slots.find((s) => s.peerThreadId === peerThreadId);
}

export function findConnectedPeerSlot(
  roster: PinnedPeerRoster,
  peerThreadId: string
): HubRoomSlot | undefined {
  const slot = findSlotByPeerId(roster, peerThreadId);
  return slot?.connection === "connected" ? slot : undefined;
}

/** @deprecated — use findConnectedPeerSlot */
export function findPinnedSlot(
  roster: PinnedPeerRoster,
  peerThreadId: string
): HubRoomSlot | undefined {
  return findConnectedPeerSlot(roster, peerThreadId);
}

export function countConnectedPeers(roster: PinnedPeerRoster): number {
  return roster.slots.filter((s) => s.connection === "connected").length;
}

export function rosterHasVacantSlot(roster: PinnedPeerRoster): boolean {
  return roster.slots.some((s) => s.connection === "vacant");
}

/** @deprecated */
export function rosterHasRoom(roster: PinnedPeerRoster): boolean {
  return rosterHasVacantSlot(roster);
}

export function isPeerConnectedToHub(
  roster: PinnedPeerRoster,
  peerThreadId: string
): boolean {
  return Boolean(findConnectedPeerSlot(roster, peerThreadId));
}

export type PinPeerResult =
  | { ok: true; roster: PinnedPeerRoster; slot: HubRoomSlot }
  | { ok: false; reason: "no_vacant_slot"; roster: PinnedPeerRoster }
  | { ok: false; reason: "already_connected"; roster: PinnedPeerRoster; slot: HubRoomSlot };

export function connectPeerToHub(input: {
  roster: PinnedPeerRoster;
  peerThreadId: string;
  displayName: string;
  preferredSlotIndex?: PinnedSlotIndex;
  now?: string;
}): PinPeerResult {
  const now = input.now ?? new Date().toISOString();
  const roster = ensureFiveHubSlots(input.roster);
  const existing = findSlotByPeerId(roster, input.peerThreadId);

  if (existing?.connection === "connected") {
    const slots = roster.slots.map((s) =>
      s.peerThreadId === input.peerThreadId
        ? {
            ...s,
            displayName: input.displayName.trim(),
            roomKind: resolveHubRoomKind(input.peerThreadId),
            pinnedAt: now,
          }
        : s
    );
    const slot = slots.find((s) => s.peerThreadId === input.peerThreadId)!;
    return { ok: false, reason: "already_connected", roster: { slots }, slot };
  }

  let targetIndex = input.preferredSlotIndex;
  if (targetIndex === undefined) {
    const vacant = roster.slots.find((s) => s.connection === "vacant");
    const reclaim = roster.slots.find(
      (s) =>
        s.connection === "purge_pending" && s.peerThreadId === input.peerThreadId
    );
    targetIndex = reclaim?.slotIndex ?? vacant?.slotIndex;
  }

  if (targetIndex === undefined) {
    return { ok: false, reason: "no_vacant_slot", roster };
  }

  const slot: HubRoomSlot = {
    slotIndex: targetIndex,
    connection: "connected",
    peerThreadId: input.peerThreadId,
    displayName: input.displayName.trim(),
    roomKind: resolveHubRoomKind(input.peerThreadId),
    pinnedAt: now,
    unpinnedAt: undefined,
    purgeAfter: undefined,
  };

  const slots = roster.slots.map((s) =>
    s.slotIndex === targetIndex ? slot : s
  );
  return { ok: true, roster: { slots }, slot };
}

/** @deprecated — use connectPeerToHub */
export function pinPeerToRoster(input: {
  roster: PinnedPeerRoster;
  peerThreadId: string;
  displayName: string;
  now?: string;
}): PinPeerResult {
  return connectPeerToHub(input);
}

/** User removes pin — hub slot frees immediately; archive handles 7d retention. */
export function unpinPeerFromHub(
  roster: PinnedPeerRoster,
  peerThreadId: string,
  _now?: string
): PinnedPeerRoster {
  const slots = roster.slots.map((slot) => {
    if (slot.peerThreadId !== peerThreadId) {
      return slot;
    }
    return vacantSlot(slot.slotIndex);
  });
  return { slots };
}

/** @deprecated */
export function unpinPeerFromRoster(
  roster: PinnedPeerRoster,
  peerThreadId: string
): PinnedPeerRoster {
  return unpinPeerFromHub(roster, peerThreadId);
}

export function assignPeerToHubSlot(input: {
  roster: PinnedPeerRoster;
  slotIndex: PinnedSlotIndex;
  peerThreadId: string;
  displayName: string;
  now?: string;
}): { roster: PinnedPeerRoster; slot: HubRoomSlot } {
  const result = connectPeerToHub({
    roster: input.roster,
    peerThreadId: input.peerThreadId,
    displayName: input.displayName,
    preferredSlotIndex: input.slotIndex,
    now: input.now,
  });
  const roster = result.roster;
  const slot =
    result.ok === true
      ? result.slot
      : result.reason === "already_connected"
        ? result.slot
        : findHubSlot(roster, input.slotIndex);
  return { roster, slot };
}

export function resolvePinnedDisplayName(
  roster: PinnedPeerRoster,
  mention: string
): HubRoomSlot | undefined {
  const token = mention.trim().toLowerCase();
  return roster.slots.find(
    (s) =>
      s.connection === "connected" &&
      s.displayName?.trim().toLowerCase() === token
  );
}

export function purgePendingLabel(slot: HubRoomSlot): string | null {
  if (slot.connection !== "purge_pending" || !slot.purgeAfter) {
    return null;
  }
  const days = daysUntilPurge(slot.purgeAfter);
  return days === 0 ? "오늘 삭제" : `${days}일 후 삭제`;
}
