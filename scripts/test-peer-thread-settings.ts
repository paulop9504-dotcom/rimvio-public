#!/usr/bin/env npx tsx
import { FIVE_PEER_ROOMS_PRODUCT } from "../lib/context/five-peer-rooms-product";
import {
  clearPeerContactsTestOverride,
  resetPeerContactsForTests,
} from "../lib/context/peer-contact-store";
import {
  applyAiLensToggle,
  applyPinToggleIntent,
  canImportPeerAtMention,
  isPinnedFullStorage,
  peerStorageMode,
  shouldPersistPeerMessageLog,
  shouldRunAiLens,
  shouldRunEphemeralExtract,
  shouldShowContextRail,
} from "../lib/context/peer-thread-policy";
import {
  connectPeerToHub,
  countConnectedPeers,
  emptyPinnedRoster,
  ensureFiveHubSlots,
  rosterHasVacantSlot,
  unpinPeerFromHub,
} from "../lib/context/pinned-peer-roster";
import type { PeerThreadSettings } from "../lib/context/peer-thread-types";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const base: PeerThreadSettings = {
  peerThreadId: "peer-1",
  displayName: "지수",
  aiLensEnabled: false,
  isPinned: false,
  updatedAt: new Date().toISOString(),
};

let roster = ensureFiveHubSlots(emptyPinnedRoster());

// Connect (pin) without lens
const pinIntentOff = applyPinToggleIntent({
  settings: base,
  nextPinned: true,
});
if (!pinIntentOff.allowed) {
  fail("pin_allowed_when_lens_off");
}
const pin = connectPeerToHub({
  roster,
  peerThreadId: "peer-1",
  displayName: "지수",
});
if (!pin.ok) {
  fail("pin_peer");
}
roster = pin.roster;
const pinnedOnly = { ...base, isPinned: true };

if (!isPinnedFullStorage({ settings: pinnedOnly, roster })) {
  fail("pinned_storage_without_lens");
}
if (!shouldPersistPeerMessageLog({ settings: pinnedOnly, roster })) {
  fail("persist_without_lens");
}
if (!canImportPeerAtMention({ settings: pinnedOnly, roster })) {
  fail("at_import_without_lens");
}
if (shouldShowContextRail({ settings: pinnedOnly, roster })) {
  fail("rail_off_when_lens_off");
}
if (shouldRunEphemeralExtract({ settings: pinnedOnly, roster })) {
  fail("no_ephemeral_when_pinned_only");
}

// Lens on does not clear pin
const lensOnPinned = applyAiLensToggle({
  settings: pinnedOnly,
  nextEnabled: true,
});
if (!lensOnPinned.isPinned) {
  fail("lens_on_keeps_pin");
}
if (peerStorageMode({ settings: lensOnPinned, roster }) !== "pinned_full") {
  fail("both_on_pinned_full");
}

const lensOffAgain = applyAiLensToggle({
  settings: lensOnPinned,
  nextEnabled: false,
});
if (!shouldPersistPeerMessageLog({ settings: lensOffAgain, roster })) {
  fail("persist_after_lens_off");
}

if (FIVE_PEER_ROOMS_PRODUCT) {
  if (shouldRunEphemeralExtract({ settings: base, roster })) {
    fail("five_rooms_no_ephemeral");
  }
  const stranger: PeerThreadSettings = {
    ...base,
    peerThreadId: "peer-unknown",
    aiLensEnabled: true,
    isPinned: false,
  };
  if (peerStorageMode({ settings: stranger, roster }) !== "none") {
    fail("no_slot_no_storage");
  }
  const unpinnedPeer: PeerThreadSettings = {
    ...pinnedOnly,
    isPinned: false,
  };
  if (isPinnedFullStorage({ settings: unpinnedPeer, roster })) {
    fail("unpinned_not_active");
  }
}

if (shouldRunAiLens({ settings: base, roster })) {
  fail("lens_off_should_not_run");
}

// Always 5 hub slots
if (roster.slots.length !== 5) {
  fail("always_five_hub_slots");
}

// Fill connected peers
let fillRoster = ensureFiveHubSlots(emptyPinnedRoster());
for (let i = 0; i < 5; i++) {
  const r = connectPeerToHub({
    roster: fillRoster,
    peerThreadId: `peer-fill-${i}`,
    displayName: `friend-${i}`,
  });
  if (!r.ok) {
    fail(`fill_pin_${i}`);
  }
  fillRoster = r.roster;
}
if (rosterHasVacantSlot(fillRoster)) {
  fail("roster_should_be_full");
}
if (countConnectedPeers(fillRoster) !== 5) {
  fail("five_connected");
}
const sixth = connectPeerToHub({
  roster: fillRoster,
  peerThreadId: "peer-6",
  displayName: "six",
});
if (sixth.ok || sixth.reason !== "no_vacant_slot") {
  fail("sixth_should_fail");
}

// Unpin keeps ROOM slot, enters purge_pending
const unpinned = unpinPeerFromHub(fillRoster, "peer-fill-0");
const slot0 = unpinned.slots.find((s) => s.slotIndex === 0);
if (slot0?.connection !== "purge_pending") {
  fail("unpin_purge_pending");
}
if (unpinned.slots.length !== 5) {
  fail("room_stays_after_unpin");
}
if (!slot0?.purgeAfter) {
  fail("purge_after_set");
}

if (violations.length > 0) {
  console.error("FAIL peer-thread-settings");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  clearPeerContactsTestOverride();
  process.exit(1);
}

clearPeerContactsTestOverride();
console.log("PASS peer-thread-settings");
