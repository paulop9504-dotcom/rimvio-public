#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { PeerContact } from "../lib/context/peer-contact-types";
import { filterContactsForGroupAdd } from "../lib/peer-chat/group-member-eligibility";

const callerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const friendA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const friendB = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const dmA = `peer-dm-${callerId}__${friendA}`;
const dmB = `peer-dm-${callerId}__${friendB}`;
const groupId = "peer-group-11111111-1111-1111-1111-111111111111";

function contact(peerThreadId: string, name: string): PeerContact {
  const now = new Date().toISOString();
  return {
    peerThreadId,
    displayName: name,
    createdAt: now,
    updatedAt: now,
  };
}

const contacts = [
  contact(dmA, "민수"),
  contact(dmB, "지연"),
  contact(groupId, "단톡"),
  contact("peer-local-demo", "데모"),
];

const eligible = filterContactsForGroupAdd({
  contacts,
  memberUserIds: new Set([callerId, friendA]),
  callerUserId: callerId,
});

assert.equal(eligible.length, 1);
assert.equal(eligible[0]?.peerThreadId, dmB);
assert.equal(eligible[0]?.displayName, "지연");

const none = filterContactsForGroupAdd({
  contacts,
  memberUserIds: new Set([callerId, friendA, friendB]),
  callerUserId: callerId,
});
assert.equal(none.length, 0);

console.log("test-group-member-eligibility: ok");
