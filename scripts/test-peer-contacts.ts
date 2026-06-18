#!/usr/bin/env npx tsx
import {
  addPeerContact,
  clearPeerContactsTestOverride,
  readPeerContacts,
  resetPeerContactsForTests,
} from "../lib/context/peer-contact-store";
import { isKnownPeerContact } from "../lib/context/five-peer-rooms-product";
import {
  canImportPeerAtMention,
  peerStorageMode,
  shouldPersistPeerMessageLog,
} from "../lib/context/peer-thread-policy";
import { connectPeerToHub, emptyPinnedRoster } from "../lib/context/pinned-peer-roster";
import type { PeerThreadSettings } from "../lib/context/peer-thread-types";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetPeerContactsForTests();

const added = addPeerContact({ displayName: "민수" });
if (!added.ok) {
  fail("add_contact");
}

const many = Array.from({ length: 12 }, (_, i) =>
  addPeerContact({ displayName: `friend-${i}` })
);
if (many.some((r) => !r.ok)) {
  fail("unlimited_add");
}
if (readPeerContacts().length < 13) {
  fail("contact_count");
}

let roster = emptyPinnedRoster();
const pin = connectPeerToHub({
  roster,
  peerThreadId: added.ok ? added.contact.peerThreadId : "peer-x",
  displayName: "민수",
});
if (!pin.ok) {
  fail("pin_minsu");
}
roster = pin.roster;

const pinnedSettings: PeerThreadSettings = {
  peerThreadId: added.ok ? added.contact.peerThreadId : "peer-x",
  displayName: "민수",
  aiLensEnabled: true,
  isPinned: true,
  updatedAt: new Date().toISOString(),
};

const unpinned = addPeerContact({ displayName: "동료" });
if (!unpinned.ok) {
  fail("add_unpinned");
}
const unpinnedSettings: PeerThreadSettings = {
  peerThreadId: unpinned.contact.peerThreadId,
  displayName: unpinned.contact.displayName,
  aiLensEnabled: false,
  isPinned: false,
  updatedAt: new Date().toISOString(),
};

if (peerStorageMode({ settings: pinnedSettings, roster }) !== "pinned_full") {
  fail("pinned_full_mode");
}
if (peerStorageMode({ settings: unpinnedSettings, roster }) !== "contact_basic") {
  fail("contact_basic_mode");
}
if (!shouldPersistPeerMessageLog({ settings: unpinnedSettings, roster })) {
  fail("unpinned_persist");
}
if (canImportPeerAtMention({ settings: unpinnedSettings, roster })) {
  fail("unpinned_no_import");
}
if (!canImportPeerAtMention({ settings: pinnedSettings, roster })) {
  fail("pinned_import");
}

const cloudDmSettings: PeerThreadSettings = {
  peerThreadId: "peer-dm-user-a__user-b",
  displayName: "서버친구",
  aiLensEnabled: false,
  isPinned: false,
  updatedAt: new Date().toISOString(),
};
if (!isKnownPeerContact({ settings: cloudDmSettings, roster })) {
  fail("registered_dm_known_without_local_contact");
}
if (!shouldPersistPeerMessageLog({ settings: cloudDmSettings, roster })) {
  fail("registered_dm_persist");
}

clearPeerContactsTestOverride();

if (violations.length > 0) {
  console.error("FAIL peer-contacts");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS peer-contacts");
