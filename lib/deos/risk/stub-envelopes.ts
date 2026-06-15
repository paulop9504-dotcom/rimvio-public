import type { RiskEnvelope } from "@/lib/deos/risk/risk-envelope-types";
import { RISK_ENVELOPE_VERSION } from "@/lib/deos/risk/risk-envelope-types";

/** Test / dev factory — not a live mandate signer. */
export function createStubRiskEnvelope(
  overrides: Partial<RiskEnvelope> & Pick<RiskEnvelope, "scopeId">
): RiskEnvelope {
  const now = new Date("2026-06-01T12:00:00.000Z");
  const expires = new Date("2027-06-01T12:00:00.000Z");

  return {
    envelopeId: overrides.envelopeId ?? "env-stub-1",
    scopeId: overrides.scopeId,
    plane: overrides.plane ?? "paper",
    strategyId: overrides.strategyId ?? "alpha-1",
    signedAt: overrides.signedAt ?? now.toISOString(),
    expiresAt: overrides.expiresAt ?? expires.toISOString(),
    allowedSymbols: overrides.allowedSymbols ?? ["005930", "AAPL"],
    maxNotionalPerOrder: overrides.maxNotionalPerOrder ?? 10_000_000,
    maxNotionalPerDay: overrides.maxNotionalPerDay ?? 50_000_000,
    maxOpenOrders: overrides.maxOpenOrders ?? 20,
    maxPositionQty: overrides.maxPositionQty ?? { "005930": 100 },
    maxLeverage: overrides.maxLeverage ?? 2,
    orderRatePerSec: overrides.orderRatePerSec ?? 10,
    allowedSides: overrides.allowedSides ?? ["BUY", "SELL"],
    allowedOrderTypes: overrides.allowedOrderTypes ?? [
      "LIMIT",
      "MARKET",
    ],
    killSwitch: overrides.killSwitch ?? "ARMED",
    version: RISK_ENVELOPE_VERSION,
  };
}

export function createStubEnvelopeUsage(
  overrides: Partial<import("@/lib/deos/risk/risk-envelope-types").EnvelopeUsageSnapshot> = {}
): import("@/lib/deos/risk/risk-envelope-types").EnvelopeUsageSnapshot {
  return {
    clockIso: overrides.clockIso ?? "2026-06-01T12:00:00.000Z",
    notionalUsedToday: overrides.notionalUsedToday ?? 0,
    openOrderCount: overrides.openOrderCount ?? 0,
    positionQty: overrides.positionQty ?? {},
    seenClientOrderIds: overrides.seenClientOrderIds ?? [],
    rateBucket: overrides.rateBucket,
  };
}
