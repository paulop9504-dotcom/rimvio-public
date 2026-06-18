#!/usr/bin/env npx tsx
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import { traceApproveCandidate } from "../lib/event-os/trace-event-os-interaction";
import {
  moveCardToDeferred,
  restoreDeferredCard,
  upsertCardFromProof,
  upsertSeedCard,
  waitingCardFromOcrTrigger,
  validateThreadlineKernelGuards,
} from "../lib/threadline";
import { THREADLINE_ACTIVE_OCR_CARD_ID } from "../lib/threadline/seed-ocr-waiting-card";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const seed = waitingCardFromOcrTrigger({
  type: "OCR_REVIEW_DATE_PICKER",
  rows: [{ candidateId: "c1", title: "병원", time: "14:00" }],
});

if (seed.id !== THREADLINE_ACTIVE_OCR_CARD_ID) {
  fail(`seed_id:${seed.id}`);
}
if (seed.state !== "WAITING" || !seed.chips?.length) {
  fail("seed_not_waiting");
}

let cards = upsertSeedCard([], seed);
const deferredResult = moveCardToDeferred(cards, [], seed.id);
if (deferredResult.cards.length !== 0) {
  fail("defer_visible_empty");
}
if (deferredResult.deferred.length !== 1) {
  fail("defer_bucket");
}

const restored = restoreDeferredCard(
  deferredResult.cards,
  deferredResult.deferred,
  seed.id
);
if (!restored.cards.some((c) => c.state === "WAITING")) {
  fail("restore_waiting");
}

setupOcrReviewFlow();
const proof = traceApproveCandidate({ message: "맞아" });
cards = upsertCardFromProof(upsertSeedCard([], seed), {
  proof,
  gatePhase: "awaiting_date",
});
if (cards.some((c) => c.id === THREADLINE_ACTIVE_OCR_CARD_ID)) {
  fail("ocr_active_replaced");
}

const guards = validateThreadlineKernelGuards(cards);
if (guards.length > 0) {
  fail(`guards:${guards.join(",")}`);
}

console.log(
  JSON.stringify(
    { status: violations.length === 0 ? "PASS" : "FAIL", violations },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-threadline-v11: ok");
