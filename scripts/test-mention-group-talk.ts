#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseMentionActionInput } from "../lib/action-chat/mention-actions/commit-mention-action-turn";
import { buildMentionActionWire } from "../lib/action-chat/mention-actions/build-mention-action-wire";
import { isMentionActionInlineFeature } from "../lib/action-chat/mention-actions/mention-action-inline-features";
import { parseActiveGroupTalkComposer } from "../lib/peer-chat/active-group-talk-composer";
import { isFeedTalkInlineFeature } from "../lib/action-chat/feed-peer-talk/feed-talk-inline-features";
import {
  getMentionFeature,
  resolveMentionFeature,
} from "../lib/event-kernel/action-contracts/mention-feature-registry";
import { groupTargetAsPeerContact } from "../lib/peer-chat/group-target-as-contact";

assert.equal(resolveMentionFeature("단톡")?.featureId, "group_talk");
assert.ok(isMentionActionInlineFeature("group_talk"));
assert.ok(isFeedTalkInlineFeature("group_talk"));

const parsed = parseMentionActionInput("@단톡 주말모임");
assert.ok(parsed);
assert.equal(parsed!.featureId, "group_talk");
assert.equal(parsed!.query, "주말모임");

const wire = buildMentionActionWire({
  feature: getMentionFeature("group_talk")!,
  query: "주말",
});
assert.ok(wire);
assert.equal(wire!.featureId, "group_talk");
assert.equal(wire!.groupTalkQuery, "주말");

assert.equal(parseActiveGroupTalkComposer("안녕 @단톡 주말")?.query, "주말");
assert.equal(parseActiveGroupTalkComposer("@톡 수연"), null);

const groupTarget = {
  peerThreadId: "peer-group-11111111-1111-1111-1111-111111111111",
  displayName: "주말 모임",
};
const contact = groupTargetAsPeerContact(groupTarget);
assert.equal(contact.peerThreadId, groupTarget.peerThreadId);
assert.equal(contact.displayName, "주말 모임");

console.log("test-mention-group-talk: ok");
