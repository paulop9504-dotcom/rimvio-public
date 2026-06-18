#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import {
  applySendingToActiveWaiting,
  moveCardToDeferred,
  proofToDecisionCard,
  resolvePayloadFromChip,
  threadlineHeaderStatus,
  upsertCardFromProof,
  validateThreadlineKernelGuards,
} from "../lib/threadline";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

setupOcrReviewFlow();

const approveProof = traceApproveCandidate({ message: "맞아" });
let cards = upsertCardFromProof([], {
  proof: approveProof,
  gatePhase: "awaiting_date",
});

const approveCard = cards[0];
if (approveCard?.state !== "WAITING") {
  fail(`approve_state:${approveCard?.state}`);
}
if (!approveCard?.chips || approveCard.chips.length > 3) {
  fail(`approve_chips:${approveCard?.chips?.length}`);
}
if (approveCard?.settledLine) {
  fail("approve_has_settled");
}
if (!approveCard.because.includes("날짜")) {
  fail("approve_because_human");
}
if (approveCard.because.includes("MISSING_DATE")) {
  fail("approve_because_technical");
}

cards = applySendingToActiveWaiting(cards, true);
if (cards[0]?.state !== "WORKING") {
  fail(`working_state:${cards[0]?.state}`);
}
if (cards[0]?.chips?.length) {
  fail("working_has_chips");
}

cards = applySendingToActiveWaiting(cards, false);

const datePayload = resolvePayloadFromChip("date_default");
if (datePayload?.kind !== "ocr_date") {
  fail("date_payload");
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const dateProof = traceSetCandidateDate({ patches });
cards = upsertCardFromProof(cards, {
  proof: dateProof,
  gatePhase: "awaiting_confirm",
});

const confirmProof = traceConfirmCommit({ syncClient: false });
cards = upsertCardFromProof(cards, { proof: confirmProof });

const done = cards.find((c) => c.id === `card:${confirmProof.proofHash}`);
if (!done?.settledLine) {
  fail("done_settled_missing");
}
if (done?.chips?.length) {
  fail("done_has_chips");
}

const onlyWaiting = upsertCardFromProof([], {
  proof: approveProof,
  gatePhase: "awaiting_date",
});
const deferredMove = moveCardToDeferred(
  onlyWaiting,
  [],
  onlyWaiting[0]!.id
);
if (deferredMove.cards.length > 0) {
  fail("defer_should_empty_visible");
}
if (deferredMove.deferred.length !== 1) {
  fail("defer_bucket_missing");
}

const guardFailures = validateThreadlineKernelGuards(cards);
if (guardFailures.length > 0) {
  fail(`guards:${guardFailures.join(",")}`);
}

if (threadlineHeaderStatus(cards) !== "all_set") {
  fail(`header:${threadlineHeaderStatus(cards)}`);
}

if (threadlineHeaderStatus(onlyWaiting) !== "needs_one_tap") {
  fail("header_waiting");
}

const model = proofToDecisionCard({
  proof: approveProof,
  gatePhase: "awaiting_date",
});
if (model.chips && model.settledLine) {
  fail("model_xor");
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      doneBecause: done?.because,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-threadline-kernel: ok");
