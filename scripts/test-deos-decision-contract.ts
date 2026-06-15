#!/usr/bin/env npx tsx
import {
  composeDecision,
  rankCandidates,
  validateStateTransition,
  validateSurfaceTransition,
  projectSurfaceToDecisionCard,
  ocrReviewCandidatesFromTrigger,
} from "../lib/deos/decision";
import { validateThreadlineKernelGuards } from "../lib/threadline";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const trigger = {
  type: "OCR_REVIEW_DATE_PICKER" as const,
  rows: [{ candidateId: "c1", title: "병원", time: "14:00" }],
};

const candidates = ocrReviewCandidatesFromTrigger(trigger, "awaiting_date");
const probability = rankCandidates(candidates);

const result = composeDecision({
  intent: {
    raw: "맞아",
    kind: "approve_speech",
    scopeId: "default",
    clockIso: new Date().toISOString(),
  },
  state: {
    scopeId: "default",
    cardState: "WAITING",
    activeCardId: "card:ocr-active",
    gatePhase: "awaiting_date",
  },
  candidates,
  probability,
  title: "병원",
});

if (result.surface.mode !== "fork") {
  fail(`expected_fork:${result.surface.mode}`);
}

if (result.surface.mode === "fork" && result.surface.chips.length > 3) {
  fail(`fork_overflow:${result.surface.chips.length}`);
}

const surfaceValid = validateSurfaceTransition(result.surface);
if (!surfaceValid.allowed) {
  fail(`surface_invalid:${surfaceValid.reason}`);
}

const illegal = validateStateTransition({
  from: "DONE",
  to: "DEFERRED",
  viaActionId: "x",
});
if (illegal.allowed) {
  fail("state_should_block_done_to_deferred");
}

const card = projectSurfaceToDecisionCard(result.surface, {
  cardId: "card:test",
});
const guards = validateThreadlineKernelGuards([card]);
if (guards.length > 0) {
  fail(`threadline_guards:${guards.join(",")}`);
}

if (!card.because || card.because.includes("MISSING")) {
  fail("because_has_technical_terms");
}

const autoCandidates = [
  ...candidates.filter((c) => c.kind !== "defer"),
  candidates.find((c) => c.kind === "defer")!,
];
const autoRank = rankCandidates(autoCandidates, {
  pluginPrior: { "internal.ocr_review": 0.5 },
});
autoRank.ranked[0]!.score = 0.99;
if (autoRank.ranked[1]) {
  autoRank.ranked[1].score = 0.1;
}

const autoResult = composeDecision({
  intent: {
    raw: "run",
    kind: "resolve",
    scopeId: "default",
    clockIso: new Date().toISOString(),
  },
  state: {
    scopeId: "default",
    cardState: "WAITING",
    activeCardId: null,
  },
  candidates: autoCandidates,
  probability: autoRank,
});

if (autoResult.surface.mode !== "auto" && autoResult.surface.mode !== "fork") {
  fail(`auto_mode:${autoResult.surface.mode}`);
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      forkChips:
        result.surface.mode === "fork"
          ? result.surface.chips.map((c) => c.label)
          : [],
      composeMode: result.surface.mode,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-deos-decision-contract: ok");
