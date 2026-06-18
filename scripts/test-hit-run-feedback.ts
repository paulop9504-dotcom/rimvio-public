#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  formatTikiChoiceReply,
  parseTikiChoiceBlock,
  parseTikiChoiceOptions,
} from "../lib/action-chat/parse-tiki-choice-options";
import { appendHitRunFeedback } from "../lib/action-chat/hit-run-feedback/append-hit-run-feedback";

const sample = buildTikiTakaOfflineReplySample();

function buildTikiTakaOfflineReplySample(): string {
  return [
    "지금은 **뭐 먹을지 고르는** 쪽으로 보여요.",
    "",
    "A) 빠르게 (국밥·분식·편의)",
    "B) 맛 기준 (고기·일식·한식)",
    "C) 가볍게 (샐러드·샌드·브런치)",
    "",
    "👉 오늘은 어느 쪽이 더 끌려요?",
  ].join("\n");
}

const parsed = parseTikiChoiceBlock(sample);
assert.equal(parsed.hasChoices, true);
assert.equal(parsed.choices.length, 3);
assert.equal(parsed.choices[0]?.letter, "A");
assert.match(parsed.intro, /뭐 먹을지/u);
assert.match(parsed.closing ?? "", /👉/u);

assert.equal(
  formatTikiChoiceReply({ letter: "A", text: "가성비·가격" }),
  "A) 가성비·가격"
);

assert.equal(parseTikiChoiceOptions("안녕하세요").length, 0);

const dir = mkdtempSync(join(tmpdir(), "hit-run-feedback-"));
const logPath = join(dir, "hit-run-feedback.jsonl");

const entry = appendHitRunFeedback(
  {
    verdict: "down",
    messageId: "msg-1",
    userMessage: "뭐하지",
    assistantSummary: sample,
    chatAxis: "decision",
    metadata: {
      routing_patch: "PATCH1_DECISION_FORCE",
      ai_intent: "DECISION",
    },
  },
  logPath
);

assert.equal(entry.verdict, "down");
assert.equal(entry.routing?.routing_patch, "PATCH1_DECISION_FORCE");

const lines = readFileSync(logPath, "utf8").trim().split("\n");
assert.equal(lines.length, 1);
assert.equal(JSON.parse(lines[0]!).type, "hit_run_feedback");

console.log("test-hit-run-feedback: ok");
