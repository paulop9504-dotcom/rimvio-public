#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryBuildMentionTimerTurn } from "../lib/action-chat/mention-timer/commit-mention-timer-turn";
import {
  buildInlineChatTimerWire,
  formatMentionTimerLabel,
  parseMentionTimerDuration,
} from "../lib/action-chat/mention-timer/inline-chat-timer";
import { parseActionMention } from "../lib/event-kernel/action-contracts/parse-action-mention";
import { tryDispatchLocalMentionTurn } from "../lib/action-chat/dispatch-local-mention-turn";

assert.equal(parseMentionTimerDuration("5분"), 5 * 60 * 1000);
assert.equal(parseMentionTimerDuration("3분"), 3 * 60 * 1000);

assert.equal(parseActionMention("@타이머 3분"), null);

const turn = tryBuildMentionTimerTurn({ text: "@타이머 3분" });
assert.ok(turn);
assert.ok(turn![1]!.inlineChatTimer);

assert.equal(
  tryDispatchLocalMentionTurn({ text: "@타이머 3분" }),
  null,
  "slim protocol: timer not dispatched — use @알림 or NL",
);

const wire = buildInlineChatTimerWire(3 * 60 * 1000, Date.parse("2026-06-01T10:00:00.000Z"));
assert.equal(wire.label, formatMentionTimerLabel(3 * 60 * 1000));

console.log("test-mention-timer: ok");
