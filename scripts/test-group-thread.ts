#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildGroupThreadId,
  GROUP_THREAD_PREFIX,
  isGroupThreadId,
  isPeerThreadId,
} from "../lib/peer-chat/group-thread";
import { resolveGroupMemberUserIds } from "../lib/peer-chat/server-peer-chat";

const groupId = buildGroupThreadId();
assert.ok(groupId.startsWith(GROUP_THREAD_PREFIX));
assert.equal(isGroupThreadId(groupId), true);
assert.equal(isGroupThreadId("peer-dm-a__b"), false);
assert.equal(isPeerThreadId("peer-dm-a__b"), true);
assert.equal(isPeerThreadId(groupId), true);
assert.equal(isPeerThreadId("legacy-local"), false);

const caller = "11111111-1111-1111-1111-111111111111";
const friendA = "22222222-2222-2222-2222-222222222222";
const friendB = "33333333-3333-3333-3333-333333333333";
const dmA = `peer-dm-${[caller, friendA].sort().join("__")}`;
const dmB = `peer-dm-${[caller, friendB].sort().join("__")}`;

const members = resolveGroupMemberUserIds({
  callerUserId: caller,
  memberThreadIds: [dmA, dmB],
});
assert.deepEqual(members.sort(), [friendA, friendB].sort());

assert.throws(
  () =>
    resolveGroupMemberUserIds({
      callerUserId: caller,
      memberThreadIds: [groupId],
    }),
  /invalid_member/,
);

console.log("test-group-thread: ok");
