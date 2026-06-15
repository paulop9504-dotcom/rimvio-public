#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveMentionFeature } from "../lib/event-kernel/action-contracts/mention-feature-registry";
import { parseMentionActionInput } from "../lib/action-chat/mention-actions/commit-mention-action-turn";
import { buildMentionActionWire } from "../lib/action-chat/mention-actions/build-mention-action-wire";
import { getMentionFeature } from "../lib/event-kernel/action-contracts/mention-feature-registry";

assert.equal(resolveMentionFeature("친추")?.featureId, "friend_add");
const parsed = parseMentionActionInput("@친추 rimvio_test");
assert.ok(parsed);
assert.equal(parsed!.featureId, "friend_add");
assert.equal(parsed!.query, "rimvio_test");

const wire = buildMentionActionWire({
  feature: getMentionFeature("friend_add")!,
  query: "010-1234-5678",
});
assert.equal(wire?.friendAddContact, "010-1234-5678");

console.log("test-mention-friend-add: ok");
