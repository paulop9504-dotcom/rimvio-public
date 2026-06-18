import assert from "node:assert/strict";
import { tryBuildMentionActionTurn } from "../lib/action-chat/mention-actions/commit-mention-action-turn";
import {
  buildMentionManualCatalog,
  countMentionManualCatalogRows,
} from "../lib/action-chat/mention-manual/build-mention-manual-catalog";
import { resolveMentionFeature } from "../lib/event-kernel/action-contracts/mention-feature-registry";

assert.equal(resolveMentionFeature("설명서")?.featureId, "manual");

const full = buildMentionManualCatalog();
assert.ok(full.length >= 4, "catalog should have category groups");
assert.ok(countMentionManualCatalogRows() >= 30, "catalog should list all features");

const taxiOnly = buildMentionManualCatalog("택시");
assert.ok(
  taxiOnly.some((group) => group.rows.some((row) => row.token === "택시")),
  "filter should include taxi",
);

const turn = tryBuildMentionActionTurn({ text: "@설명서" });
assert.ok(turn, "manual turn should build");
assert.equal(turn!.length, 2);
assert.ok(turn![1]?.inlineChatAction?.manualCatalog?.length, "assistant message has catalog");

console.log("test-mention-manual: ok");
