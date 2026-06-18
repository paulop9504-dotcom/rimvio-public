#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  classifyFailure,
  detectImplicitSignals,
  implicitSignalsImplyFailure,
  observeLiveTurn,
  proposeSystemUpdates,
  shouldAutoImproveIntent,
} from "../lib/self-learning";

// Implicit signals — "?" after assistant confirm
const repeatSignals = detectImplicitSignals("?", [
  { role: "user", content: "내일 2시 축구" },
  {
    role: "assistant",
    content: "일정 6건을 확인했어요. 맞는지 확인해 주세요.",
  },
]);
assert.ok(repeatSignals.some((s) => s.kind === "short_negative"));

const rephraseSignals = detectImplicitSignals("내일 축구 일정 넣어줘", [
  { role: "user", content: "내일 2시 축구 약속" },
  { role: "assistant", content: "검색 범위 내에 등록된 일정을 찾지 못했습니다." },
]);
assert.ok(rephraseSignals.some((s) => s.kind === "rephrase"));
assert.ok(implicitSignalsImplyFailure(rephraseSignals));

// Failure classification
const routingFail = classifyFailure({
  userMessage: "?",
  assistantSummary: "무엇을 도와드릴까요?",
  implicitSignals: [{ kind: "short_negative", message: "?" }],
});
assert.equal(routingFail.failureKind, "routing_error");
assert.equal(routingFail.isFailure, true);

const uxFail = classifyFailure({
  userMessage: "아니",
  assistantSummary: "A) 등록 B) 취소 — 확인해 주세요",
  implicitSignals: [{ kind: "short_negative", message: "아니" }],
});
assert.equal(uxFail.failureKind, "ux_mismatch");

// Live observation
const live = observeLiveTurn({
  userMessage: "응 넣어",
  assistantSummary: "제가 맥락을 잘못 짚은 것 같아요.",
  history: [
    { role: "assistant", content: "일정 6건을 찾았어요. 확인해 주세요." },
  ],
});
assert.equal(live.failureKind, "execution_error");
assert.equal(live.isFailure, true);

// Proposals — threshold gate
const records = [
  live,
  { ...live, id: "2" },
  { ...live, id: "3" },
  { ...live, id: "4" },
];
const proposals = proposeSystemUpdates(records, 3);
assert.ok(proposals.length >= 1);
assert.ok(shouldAutoImproveIntent(records, "unknown", 3));

const noProposal = proposeSystemUpdates([live], 3);
assert.equal(noProposal.length, 0);

console.log("test-self-learning-loop: ok");
