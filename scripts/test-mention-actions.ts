#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryBuildMentionActionTurn } from "../lib/action-chat/mention-actions/commit-mention-action-turn";
import { isLocalInlineMentionFeature } from "../lib/action-chat/mention-actions/mention-action-inline-features";
import { resolveMentionFeature } from "../lib/event-kernel/action-contracts/mention-feature-registry";

assert.equal(resolveMentionFeature("택시")?.featureId, "taxi");
assert.equal(resolveMentionFeature("복붙")?.featureId, "paste");
assert.equal(resolveMentionFeature("더치")?.featureId, "dutch");
assert.equal(isLocalInlineMentionFeature("taxi"), true);
assert.equal(isLocalInlineMentionFeature("meal"), false);

const taxiTurn = tryBuildMentionActionTurn({ text: "@택시 강남역" });
assert.ok(taxiTurn);
assert.equal(taxiTurn!.length, 2);
assert.equal(taxiTurn![1]?.inlineChatAction?.featureId, "taxi");

const dutchTurn = tryBuildMentionActionTurn({ text: "@더치 84000원 4명" });
assert.ok(dutchTurn?.[1]?.inlineChatAction?.summaryLines.some((line) => line.includes("1인당")));

const tipTurn = tryBuildMentionActionTurn({ text: "@팁 35000" });
assert.ok(tipTurn?.[1]?.inlineChatAction?.summaryLines.length);

const pasteTurn = tryBuildMentionActionTurn({ text: "@복붙" });
assert.ok(pasteTurn?.[1]?.inlineChatAction?.mainActionKind === "clipboard");

console.log("test-mention-actions: ok");
