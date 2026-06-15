import type {
  RiskEnvelope,
  RiskEnvelopeRateBucketState,
  RiskEnvelopeVetoResult,
} from "@/lib/deos/risk/risk-envelope-types";

/**
 * Pure token bucket — caller owns state updates on write path only.
 */
export function refillRateBucket(
  state: RiskEnvelopeRateBucketState,
  envelope: RiskEnvelope,
  nowMs: number
): RiskEnvelopeRateBucketState {
  const rate = Math.max(envelope.orderRatePerSec, 0);
  if (rate <= 0) {
    return { tokens: 0, lastRefillMs: nowMs };
  }

  const elapsedSec = Math.max(0, (nowMs - state.lastRefillMs) / 1000);
  const refill = elapsedSec * rate;
  const cap = rate;
  const tokens = Math.min(cap, state.tokens + refill);

  return {
    tokens,
    lastRefillMs: nowMs,
  };
}

export function consumeRateToken(input: {
  state: RiskEnvelopeRateBucketState;
  envelope: RiskEnvelope;
  nowMs: number;
}): { result: RiskEnvelopeVetoResult; nextState: RiskEnvelopeRateBucketState } {
  const refilled = refillRateBucket(
    input.state,
    input.envelope,
    input.nowMs
  );

  if (refilled.tokens < 1) {
    return {
      result: { allowed: false, reason: "rate_limit_exceeded" },
      nextState: refilled,
    };
  }

  return {
    result: { allowed: true },
    nextState: {
      tokens: refilled.tokens - 1,
      lastRefillMs: refilled.lastRefillMs,
    },
  };
}

export function initialRateBucketState(envelope: RiskEnvelope): RiskEnvelopeRateBucketState {
  return {
    tokens: Math.max(envelope.orderRatePerSec, 0),
    lastRefillMs: Date.now(),
  };
}
