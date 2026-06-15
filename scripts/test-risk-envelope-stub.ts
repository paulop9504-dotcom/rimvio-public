#!/usr/bin/env npx tsx
import type { CandidateAction } from "../lib/deos/decision/decision-contract-types";
import {
  createStubEnvelopeUsage,
  createStubRiskEnvelope,
  filterCandidatesByEnvelope,
  initialRateBucketState,
  isEnvelopeActive,
  validateActionAgainstEnvelope,
  validateEnqueueAgainstEnvelope,
} from "../lib/deos/risk";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const envelope = createStubRiskEnvelope({ scopeId: "default", plane: "paper" });
const usage = createStubEnvelopeUsage({
  clockIso: "2026-06-01T12:00:00.000Z",
  rateBucket: initialRateBucketState(envelope),
});

if (!isEnvelopeActive(envelope, usage.clockIso)) {
  fail("envelope_should_be_active");
}

const goodOrder: CandidateAction = {
  id: "ord-1",
  pluginId: "quant.strategy.alpha",
  source: "internal",
  label: "삼성 10주",
  kind: "order_place_limit",
  payload: {
    clientOrderId: "coid-1",
    symbol: "005930",
    side: "BUY",
    qty: 10,
    limitPrice: 72000,
    orderType: "LIMIT",
    plane: "paper",
  },
};

const ok = validateActionAgainstEnvelope({
  action: goodOrder,
  envelope,
  usage,
  checkRate: false,
});
if (!ok.allowed) {
  fail(`good_order:${ok.reason}`);
}

const badSymbol: CandidateAction = {
  ...goodOrder,
  id: "ord-2",
  payload: { ...goodOrder.payload, symbol: "UNKNOWN", clientOrderId: "coid-2" },
};
const symVeto = validateActionAgainstEnvelope({
  action: badSymbol,
  envelope,
  usage,
  checkRate: false,
});
if (symVeto.allowed) {
  fail("symbol_should_block");
}

const tripped = createStubRiskEnvelope({
  scopeId: "default",
  killSwitch: "TRIPPED",
});
const trippedVeto = validateActionAgainstEnvelope({
  action: goodOrder,
  envelope: tripped,
  usage,
  checkRate: false,
});
if (trippedVeto.allowed) {
  fail("kill_should_block_order");
}

const pause: CandidateAction = {
  id: "pause-1",
  pluginId: "internal.risk.envelope",
  source: "internal",
  label: "중지",
  kind: "strategy_pause",
  payload: {},
};
const pauseOk = validateActionAgainstEnvelope({
  action: pause,
  envelope: tripped,
  usage,
  checkRate: false,
});
if (!pauseOk.allowed) {
  fail(`kill_should_allow_pause:${pauseOk.reason}`);
}

const filtered = filterCandidatesByEnvelope(
  [goodOrder, badSymbol],
  envelope,
  usage
);
if (filtered.length !== 1) {
  fail(`filter_count:${filtered.length}`);
}

let bucketUsage = {
  ...usage,
  rateBucket: initialRateBucketState({
    ...envelope,
    orderRatePerSec: 2,
  }),
};
for (let i = 0; i < 2; i++) {
  const enqueue = validateEnqueueAgainstEnvelope({
    action: {
      ...goodOrder,
      payload: {
        ...goodOrder.payload,
        clientOrderId: `rate-${i}`,
      },
    },
    envelope: { ...envelope, orderRatePerSec: 2 },
    usage: bucketUsage,
  });
  if (!enqueue.veto.allowed) {
    fail(`rate_ok_${i}:${enqueue.veto.reason}`);
  }
  if (enqueue.nextRateBucket) {
    bucketUsage = { ...bucketUsage, rateBucket: enqueue.nextRateBucket };
  }
}

const rateBlock = validateEnqueueAgainstEnvelope({
  action: {
    ...goodOrder,
    payload: { ...goodOrder.payload, clientOrderId: "rate-block" },
  },
  envelope: { ...envelope, orderRatePerSec: 2 },
  usage: bucketUsage,
});
if (rateBlock.veto.allowed) {
  fail("rate_should_block_third");
}

const ocrPass: CandidateAction = {
  id: "ocr-1",
  pluginId: "internal.ocr_review",
  source: "internal",
  label: "6월 3일",
  kind: "ocr_date",
  payload: { patches: [] },
};
const ocrWithEnvelope = validateActionAgainstEnvelope({
  action: ocrPass,
  envelope,
  usage,
});
if (!ocrWithEnvelope.allowed) {
  fail("ocr_should_pass_through");
}

if (violations.length > 0) {
  console.error("FAIL risk-envelope-stub");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS risk-envelope-stub");
