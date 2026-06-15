import assert from "node:assert/strict";
import { buildMentionActionWire } from "../lib/action-chat/mention-actions/build-mention-action-wire";
import { parseMentionActionInput } from "../lib/action-chat/mention-actions/commit-mention-action-turn";
import { isMentionActionInlineFeature } from "../lib/action-chat/mention-actions/mention-action-inline-features";
import {
  getMentionFeature,
  resolveMentionFeature,
} from "../lib/event-kernel/action-contracts/mention-feature-registry";

assert.equal(resolveMentionFeature("톡")?.featureId, "peer_talk");
assert.ok(isMentionActionInlineFeature("peer_talk"));

const parsed = parseMentionActionInput("@톡 sypark");
assert.ok(parsed);
assert.equal(parsed!.featureId, "peer_talk");
assert.equal(parsed!.query, "sypark");

const wire = buildMentionActionWire({
  feature: getMentionFeature("peer_talk")!,
  query: "sypark",
});
assert.ok(wire);
assert.equal(wire!.featureId, "peer_talk");
assert.equal(wire!.peerTalkQuery, "sypark");

console.log("test-mention-peer-talk: ok");
