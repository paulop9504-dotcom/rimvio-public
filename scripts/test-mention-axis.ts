#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  axisHintCopy,
  isMentionAxisInput,
  parseMentionAxisInput,
} from "../lib/action-chat/mention-axis/parse-mention-axis";
import { resolveMentionAxisSendContext } from "../lib/action-chat/mention-axis/resolve-mention-axis-send";
import { AXIS_MENTION_SHORTCUTS } from "../lib/action-chat/mention-axis/axis-mention-shortcuts";
import { tryBuildMentionScheduleOrganizeTurn } from "../lib/action-chat/mention-schedule-organize/commit-mention-schedule-organize-turn";

assert.equal(parseMentionAxisInput("@고민")?.chatAxis, "decision");
assert.equal(parseMentionAxisInput("@고민 A vs B")?.query, "A vs B");
assert.equal(parseMentionAxisInput("@밥 강남 맛집")?.chatAxis, "meal");
assert.equal(parseMentionAxisInput("@일정 내일 약속")?.chatAxis, "schedule");
assert.equal(parseMentionAxisInput("@decision buy this?")?.chatAxis, "decision");
assert.equal(parseMentionAxisInput("@meal lunch")?.chatAxis, "meal");
assert.equal(parseMentionAxisInput("@schedule tomorrow")?.chatAxis, "schedule");

assert.equal(parseMentionAxisInput("@일정정리"), null);
assert.ok(tryBuildMentionScheduleOrganizeTurn({ text: "@일정정리" }));

assert.ok(isMentionAxisInput("@고민"));
assert.ok(!isMentionAxisInput("@일정정리"));
assert.ok(!isMentionAxisInput("@타이머 3분"));

const hint = resolveMentionAxisSendContext("@밥");
assert.ok(hint.hintTurn);
assert.equal(hint.hintTurn!.length, 2);
assert.equal(hint.hintTurn![1]!.text, axisHintCopy("meal"));
assert.equal(hint.orchestrateMessageOverride, null);

const routed = resolveMentionAxisSendContext("@일정 겹침 확인");
assert.equal(routed.chatAxis, "schedule");
assert.equal(routed.orchestrateMessageOverride, "겹침 확인");
assert.equal(routed.hintTurn, null);

assert.equal(AXIS_MENTION_SHORTCUTS.length, 3);
assert.ok(AXIS_MENTION_SHORTCUTS.some((item) => item.token === "고민"));

console.log("test-mention-axis: ok");
