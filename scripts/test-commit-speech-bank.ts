#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  COMMIT_PHRASE_BANK,
  COMMIT_TIER_LABELS,
  classifyCommitSpeech,
  isActionUiConfirm,
  isCommitRejectMessage,
  isExecutionApproval,
  phrasesForTier,
} from "../lib/action-chat/commit-speech";
import { classifyApprovalSpeechAct } from "../lib/event-kernel/review/classify-approval-speech-act";
import { classifyConfirmInterrupt } from "../lib/action-chat/confirm-interrupt";
import { isUserConfirmingActions } from "../lib/action-chat/action-confidence";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

for (const { tier, phrase } of COMMIT_PHRASE_BANK) {
  const analysis = classifyCommitSpeech(phrase);
  if (analysis.act !== "APPROVE") {
    fail(`expected APPROVE: [${tier}] "${phrase}" → ${analysis.act}`);
    continue;
  }
  if (analysis.tier !== tier) {
    fail(
      `tier mismatch: "${phrase}" expected ${tier}, got ${analysis.tier ?? "none"}`
    );
  }
}

const commaVariant = classifyCommitSpeech("응, 넣어");
assert.equal(commaVariant.act, "APPROVE");
assert.equal(commaVariant.tier, "hard_commit");

assert.equal(classifyApprovalSpeechAct("일단 넣고 보자"), "APPROVE");
assert.equal(classifyApprovalSpeechAct("아니요"), "REJECT");
assert.equal(classifyApprovalSpeechAct("오늘 날씨 좋다"), "NONE");

assert.equal(classifyConfirmInterrupt("응 넣어"), "continue_confirm");
assert.equal(classifyConfirmInterrupt("괜찮은 듯"), "continue_confirm");
assert.equal(classifyConfirmInterrupt("취소"), "cancel_task");
assert.equal(classifyConfirmInterrupt("와 날씨 좋다"), "off_topic");

assert.ok(isUserConfirmingActions("네"));
assert.ok(isUserConfirmingActions("네 보여주세요"));
assert.equal(isUserConfirmingActions("음… 일단 해보자"), false);
assert.ok(isExecutionApproval("음… 일단 해보자"));

assert.ok(isActionUiConfirm("그대로 진행"));
assert.ok(isActionUiConfirm("일단 넣어줘"));

for (const tier of Object.keys(COMMIT_TIER_LABELS) as Array<
  keyof typeof COMMIT_TIER_LABELS
>) {
  assert.ok(phrasesForTier(tier).length > 0, `empty tier: ${tier}`);
}

if (violations.length > 0) {
  console.error(
    JSON.stringify(
      {
        status: "FAIL",
        bank_size: COMMIT_PHRASE_BANK.length,
        violations: violations.slice(0, 30),
        violation_count: violations.length,
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    bank_size: COMMIT_PHRASE_BANK.length,
    tiers: Object.keys(COMMIT_TIER_LABELS).length,
  })
);
