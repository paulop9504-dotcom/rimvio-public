import {
  addPeerContact,
  syncPeerContactsFromRoster,
} from "@/lib/context/peer-contact-store";
import {
  assignPeerToHubSlot,
  connectPeerToHub,
  emptyPinnedRoster,
  normalizePinnedRoster,
  unpinPeerFromHub,
} from "@/lib/context/pinned-peer-roster";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import {
  applyAiLensToggle,
  applyPinToggleIntent,
} from "@/lib/context/peer-thread-policy";
import type {
  PeerThreadSettings,
  PinnedPeerRoster,
} from "@/lib/context/peer-thread-types";

const SETTINGS_PREFIX = "rimvio.peer-thread.settings.v1";
const ROSTER_KEY = "rimvio.peer-thread.pinned-roster.v1";

function settingsKey(peerThreadId: string) {
  return `${SETTINGS_PREFIX}.${peerThreadId}`;
}

export function defaultPeerThreadSettings(input: {
  peerThreadId: string;
  displayName: string;
}): PeerThreadSettings {
  return {
    peerThreadId: input.peerThreadId,
    displayName: input.displayName,
    aiLensEnabled: true,
    isPinned: false,
    updatedAt: new Date().toISOString(),
  };
}

export function readPeerThreadSettings(
  peerThreadId: string
): PeerThreadSettings | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(settingsKey(peerThreadId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PeerThreadSettings;
  } catch {
    return null;
  }
}

export function writePeerThreadSettings(settings: PeerThreadSettings) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(settingsKey(settings.peerThreadId), JSON.stringify(settings));
}

export function readPinnedRoster(): PinnedPeerRoster {
  if (typeof window === "undefined") {
    return emptyPinnedRoster();
  }
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) {
      return emptyPinnedRoster();
    }
    const parsed = JSON.parse(raw) as PinnedPeerRoster;
    if (!Array.isArray(parsed.slots)) {
      return emptyPinnedRoster();
    }
    return normalizePinnedRoster(parsed);
  } catch {
    return emptyPinnedRoster();
  }
}

export function writePinnedRoster(roster: PinnedPeerRoster) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(ROSTER_KEY, JSON.stringify(normalizePinnedRoster(roster)));
}

/** Write path — persist purge/migration + sync contacts from pins. */
export function syncPinnedRoster(): PinnedPeerRoster {
  const roster = readPinnedRoster();
  writePinnedRoster(roster);
  const synced = readPinnedRoster();
  syncPeerContactsFromRoster(
    synced.slots
      .filter((s) => s.peerThreadId && s.displayName)
      .map((s) => ({
        peerThreadId: s.peerThreadId!,
        displayName: s.displayName!,
      }))
  );
  return synced;
}

export function getOrCreatePeerThreadSettings(input: {
  peerThreadId: string;
  displayName: string;
}): PeerThreadSettings {
  return (
    readPeerThreadSettings(input.peerThreadId) ??
    defaultPeerThreadSettings(input)
  );
}

export type UpdatePeerThreadLensResult = {
  settings: PeerThreadSettings;
  roster: PinnedPeerRoster;
};

export function setPeerThreadAiLens(input: {
  peerThreadId: string;
  displayName: string;
  enabled: boolean;
}): UpdatePeerThreadLensResult {
  const current = getOrCreatePeerThreadSettings(input);
  let roster = readPinnedRoster();
  let settings = applyAiLensToggle({
    settings: current,
    nextEnabled: input.enabled,
  });

  writePeerThreadSettings(settings);
  writePinnedRoster(roster);
  return { settings, roster };
}

export type SetPeerThreadPinnedResult =
  | { ok: true; settings: PeerThreadSettings; roster: PinnedPeerRoster }
  | {
      ok: false;
      reason: "roster_full";
      settings: PeerThreadSettings;
      roster: PinnedPeerRoster;
    };

export function setPeerThreadPinned(input: {
  peerThreadId: string;
  displayName: string;
  pinned: boolean;
  preferredSlotIndex?: PinnedSlotIndex;
}): SetPeerThreadPinnedResult {
  const current = getOrCreatePeerThreadSettings(input);
  let roster = readPinnedRoster();

  let settings = applyPinToggleIntent({
    settings: current,
    nextPinned: input.pinned,
  }).settings;

  if (input.pinned) {
    addPeerContact({
      peerThreadId: input.peerThreadId,
      displayName: input.displayName,
    });
    const pin = connectPeerToHub({
      roster,
      peerThreadId: input.peerThreadId,
      displayName: input.displayName,
      preferredSlotIndex: input.preferredSlotIndex,
    });
    if (pin.ok === false && pin.reason === "no_vacant_slot") {
      return {
        ok: false,
        reason: "roster_full",
        settings: { ...settings, isPinned: false },
        roster: pin.roster,
      };
    }
    roster = pin.roster;
    settings = { ...settings, isPinned: true };
  } else {
    roster = unpinPeerFromHub(roster, input.peerThreadId);
    settings = { ...settings, isPinned: false, aiLensEnabled: false };
  }

  settings.updatedAt = new Date().toISOString();
  writePeerThreadSettings(settings);
  writePinnedRoster(roster);
  return { ok: true, settings, roster };
}

export type AddPeerContactOnlyResult =
  | { ok: true; settings: PeerThreadSettings }
  | { ok: false; reason: "empty_name" };

/** Write path — unlimited contact book; does not pin. */
export function addPeerContactOnly(input: {
  displayName: string;
}): AddPeerContactOnlyResult {
  const added = addPeerContact({ displayName: input.displayName });
  if (!added.ok) {
    return { ok: false, reason: added.reason };
  }
  const settings = getOrCreatePeerThreadSettings({
    peerThreadId: added.contact.peerThreadId,
    displayName: added.contact.displayName,
  });
  writePeerThreadSettings(settings);
  return { ok: true, settings };
}

export function assignPeerToHubAndPin(input: {
  slotIndex: PinnedSlotIndex;
  displayName: string;
  peerThreadId?: string;
}): { settings: PeerThreadSettings; roster: PinnedPeerRoster } {
  const added = addPeerContact({
    displayName: input.displayName,
    peerThreadId: input.peerThreadId,
  });
  const peerThreadId = added.ok
    ? added.contact.peerThreadId
    : input.peerThreadId ??
      `peer-${input.displayName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
  const displayName = added.ok ? added.contact.displayName : input.displayName.trim();

  let roster = readPinnedRoster();
  const assigned = assignPeerToHubSlot({
    roster,
    slotIndex: input.slotIndex,
    peerThreadId,
    displayName,
  });
  roster = assigned.roster;

  let settings = applyPinToggleIntent({
    settings: getOrCreatePeerThreadSettings({
      peerThreadId,
      displayName,
    }),
    nextPinned: true,
  }).settings;
  settings = { ...settings, isPinned: true, updatedAt: new Date().toISOString() };
  writePeerThreadSettings(settings);
  writePinnedRoster(roster);
  return { settings, roster };
}
