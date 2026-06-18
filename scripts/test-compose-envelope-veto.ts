#!/usr/bin/env npx tsx
import type { CandidateAction } from "../lib/deos/decision/decision-contract-types";
import {
  composeDecision,
  ocrReviewCandidatesFromTrigger,
  rankCandidates,
} from "../lib/deos/decision";
import {
  createStubEnvelopeUsage,
  createStubRiskEnvelope,
} from "../lib/deos/risk";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const trigger = {
  type: "OCR_REVIEW_DATE_PICKER" as const,
  rows: [{ candidateId: "c1", title: "병원", time: "14:00" }],
};

const ocrCandidates = ocrReviewCandidatesFromTrigger(trigger, "awaiting_date");
const envelope = createStubRiskEnvelope({ scopeId: "default", plane: "paper" });
const usage = createStubEnvelopeUsage({
  clockIso: "2026-06-01T12:00:00.000Z",
});

const ocrResult = composeDecision({
  intent: {
    raw: "",
    kind: "add",
    scopeId: "default",
    clockIso: usage.clockIso,
  },
  state: {
    scopeId: "default",
    cardState: "WAITING",
    activeCardId: "card:1",
    gatePhase: "awaiting_date",
  },
  candidates: ocrCandidates,
  probability: rankCandidates(ocrCandidates),
  title: "병원",
  envelope,
  envelopeUsage: usage,
});

if (ocrResult.surface.mode !== "fork") {
  fail(`ocr_with_envelope_fork:${ocrResult.surface.mode}`);
}
if (!ocrResult.diagnostics.includes("envelope_filter_applied")) {
  fail("ocr_should_apply_filter_diag");
}

const order: CandidateAction = {
  id: "ord-1",
  pluginId: "quant.strategy.alpha",
  source: "internal",
  label: "삼성 매수",
  kind: "order_place_limit",
  payload: {
    clientOrderId: "c1",
    symbol: "005930",
    side: "BUY",
    qty: 10,
    limitPrice: 72000,
    orderType: "LIMIT",
    plane: "paper",
  },
};

const badOrder: CandidateAction = {
  ...order,
  id: "ord-bad",
  payload: { ...order.payload, symbol: "FAKE", clientOrderId: "c2" },
};

const tradingCandidates = [order, badOrder];
const tradingProb = rankCandidates(tradingCandidates);

const allowedOnly = composeDecision({
  intent: { raw: "", kind: "resolve", scopeId: "default", clockIso: usage.clockIso },
  state: { scopeId: "default", cardState: "WAITING", activeCardId: null },
  candidates: tradingCandidates,
  probability: tradingProb,
  title: "삼성전자",
  envelope,
  envelopeUsage: usage,
});

if (allowedOnly.surface.mode !== "auto" && allowedOnly.surface.mode !== "fork") {
  fail(`trading_allowed_mode:${allowedOnly.surface.mode}`);
}
if (allowedOnly.surface.mode === "auto" && allowedOnly.surface.action.id !== "ord-1") {
  fail("trading_top_should_be_good_order");
}

const onlyBad = composeDecision({
  intent: { raw: "", kind: "resolve", scopeId: "default", clockIso: usage.clockIso },
  state: { scopeId: "default", cardState: "WAITING", activeCardId: null },
  candidates: [badOrder],
  probability: rankCandidates([badOrder]),
  envelope,
  envelopeUsage: usage,
});

if (onlyBad.surface.mode !== "blocked") {
  fail(`only_bad_blocked:${onlyBad.surface.mode}`);
}
if (onlyBad.surface.mode === "blocked" && !onlyBad.surface.because.includes("한도")) {
  fail("only_bad_because_human");
}

const tripped = createStubRiskEnvelope({
  scopeId: "default",
  killSwitch: "TRIPPED",
});
const trippedResult = composeDecision({
  intent: { raw: "", kind: "resolve", scopeId: "default", clockIso: usage.clockIso },
  state: { scopeId: "default", cardState: "WAITING", activeCardId: null },
  candidates: [order],
  probability: rankCandidates([order]),
  envelope: tripped,
  envelopeUsage: usage,
});

if (trippedResult.surface.mode !== "blocked") {
  fail(`kill_blocked:${trippedResult.surface.mode}`);
}

const expired = composeDecision({
  intent: { raw: "", kind: "resolve", scopeId: "default", clockIso: "2030-01-01T00:00:00.000Z" },
  state: { scopeId: "default", cardState: "WAITING", activeCardId: null },
  candidates: [order],
  probability: rankCandidates([order]),
  envelope,
  envelopeUsage: createStubEnvelopeUsage({ clockIso: "2030-01-01T00:00:00.000Z" }),
});

if (expired.surface.mode !== "blocked" || expired.surface.reason !== "envelope_expired") {
  fail(`expired:${expired.surface.mode}:${expired.surface.mode === "blocked" ? expired.surface.reason : ""}`);
}

if (violations.length > 0) {
  console.error("FAIL compose-envelope-veto");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS compose-envelope-veto");
