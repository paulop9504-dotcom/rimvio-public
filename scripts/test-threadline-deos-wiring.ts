#!/usr/bin/env npx tsx
import {
  composeThreadlineFromOcr,
  composeThreadlineFromProof,
} from "../lib/deos/decision/compose-threadline-card";
import { resolvePayloadFromActionId } from "../lib/deos/decision/project-surface-to-threadline";
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";
import { validateThreadlineKernelGuards } from "../lib/threadline";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

setupOcrReviewFlow();

const trigger = {
  type: "OCR_REVIEW_DATE_PICKER" as const,
  rows: [{ candidateId: "c1", title: "병원", time: "14:00" }],
};

const ocrComposition = composeThreadlineFromOcr({
  trigger,
  gatePhase: "awaiting_date",
});

if (ocrComposition.compose.surface.mode !== "fork") {
  fail(`ocr_expected_fork:${ocrComposition.compose.surface.mode}`);
}

const ocrCard = ocrComposition.card;
if (ocrCard.state !== "WAITING") {
  fail(`ocr_card_state:${ocrCard.state}`);
}
if (!ocrCard.chips || ocrCard.chips.length === 0) {
  fail("ocr_no_chips");
}
if (ocrCard.chips && ocrCard.chips.length > 3) {
  fail(`ocr_chip_overflow:${ocrCard.chips.length}`);
}

const guardsOcr = validateThreadlineKernelGuards([ocrCard]);
if (guardsOcr.length > 0) {
  fail(`ocr_guards:${guardsOcr.join(",")}`);
}

const dateChip = ocrCard.chips?.find((c) => c.id === "date_default");
if (!dateChip) {
  fail("ocr_missing_date_chip");
}

const dateActionId = ocrComposition.chipActionMap["date_default"];
const datePayload = dateActionId
  ? resolvePayloadFromActionId(dateActionId, ocrComposition.candidates)
  : null;
if (datePayload?.kind !== "ocr_date") {
  fail(`ocr_date_payload:${datePayload?.kind ?? "null"}`);
}

const approveProof = traceApproveCandidate({ message: "맞아" });
const proofComposition = composeThreadlineFromProof({
  proof: approveProof,
  gatePhase: "awaiting_date",
});

if (proofComposition.card.state !== "WAITING") {
  fail(`proof_approve_state:${proofComposition.card.state}`);
}
if (!proofComposition.card.because?.includes("날짜")) {
  fail("proof_approve_because");
}
if (proofComposition.card.proof?.proofHash !== approveProof.proofHash) {
  fail("proof_attached");
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const dateProof = traceSetCandidateDate({ patches });
const dateComposition = composeThreadlineFromProof({
  proof: dateProof,
  gatePhase: "awaiting_confirm",
});

if (dateComposition.compose.surface.mode !== "fork") {
  fail(`date_fork:${dateComposition.compose.surface.mode}`);
}

const confirmProof = traceConfirmCommit({ syncClient: false });
const doneComposition = composeThreadlineFromProof({
  proof: confirmProof,
});

if (doneComposition.card.state !== "DONE") {
  fail(`done_state:${doneComposition.card.state}`);
}
if (!doneComposition.card.settledLine) {
  fail("done_missing_settled");
}
if (doneComposition.card.chips?.length) {
  fail("done_has_chips");
}

const doneGuards = validateThreadlineKernelGuards([doneComposition.card]);
if (doneGuards.length > 0) {
  fail(`done_guards:${doneGuards.join(",")}`);
}

if (violations.length > 0) {
  console.error("FAIL threadline-deos-wiring");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS threadline-deos-wiring");
