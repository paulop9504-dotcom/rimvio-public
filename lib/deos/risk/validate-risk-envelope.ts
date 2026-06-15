import type { CandidateAction } from "@/lib/deos/decision/decision-contract-types";
import {
  estimateOrderNotional,
  isTradingOrderKind,
  parseOrderPayload,
} from "@/lib/deos/risk/order-payload";
import { consumeRateToken } from "@/lib/deos/risk/token-bucket";
import {
  KILL_SWITCH_EXEMPT_KINDS,
  type EnvelopeUsageSnapshot,
  type RiskEnvelope,
  type RiskEnvelopeVetoResult,
  type TradingOrderActionKind,
} from "@/lib/deos/risk/risk-envelope-types";

function isKillExempt(kind: TradingOrderActionKind): boolean {
  return (KILL_SWITCH_EXEMPT_KINDS as readonly string[]).includes(kind);
}

export function isEnvelopeActive(
  envelope: RiskEnvelope,
  clockIso: string
): boolean {
  const t = Date.parse(clockIso);
  const signed = Date.parse(envelope.signedAt);
  const expires = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(t) || !Number.isFinite(signed) || !Number.isFinite(expires)) {
    return false;
  }
  return t >= signed && t < expires;
}

export function filterCandidatesByEnvelope(
  candidates: CandidateAction[],
  envelope: RiskEnvelope,
  usage: EnvelopeUsageSnapshot
): CandidateAction[] {
  return candidates.filter((candidate) => {
    const veto = validateActionAgainstEnvelope({
      action: candidate,
      envelope,
      usage,
      checkRate: false,
    });
    return veto.allowed;
  });
}

export function validateActionAgainstEnvelope(input: {
  action: CandidateAction;
  envelope: RiskEnvelope;
  usage: EnvelopeUsageSnapshot;
  scopeId?: string;
  /** Set false when filtering propose list (rate checked at enqueue). */
  checkRate?: boolean;
}): RiskEnvelopeVetoResult {
  const { action, envelope, usage } = input;
  const checkRate = input.checkRate !== false;
  const scopeId = input.scopeId ?? envelope.scopeId;

  if (scopeId !== envelope.scopeId) {
    return { allowed: false, reason: "envelope_scope_mismatch" };
  }

  if (!isEnvelopeActive(envelope, usage.clockIso)) {
    return { allowed: false, reason: "envelope_expired" };
  }

  if (!isTradingOrderKind(action.kind)) {
    return { allowed: true };
  }

  if (
    envelope.killSwitch === "TRIPPED" &&
    !isKillExempt(action.kind)
  ) {
    return { allowed: false, reason: "kill_switch_tripped" };
  }

  const order = parseOrderPayload(action.payload);
  if (!order && action.kind !== "strategy_pause") {
    return { allowed: false, reason: "invalid_order_payload" };
  }

  if (!order) {
    return { allowed: true };
  }

  if (order.plane !== envelope.plane) {
    return { allowed: false, reason: "plane_mismatch" };
  }

  if (
    envelope.allowedSymbols.length > 0 &&
    !envelope.allowedSymbols.includes(order.symbol)
  ) {
    return { allowed: false, reason: "symbol_not_allowed" };
  }

  if (!envelope.allowedSides.includes(order.side)) {
    return { allowed: false, reason: "side_not_allowed" };
  }

  if (!envelope.allowedOrderTypes.includes(order.orderType)) {
    return { allowed: false, reason: "order_type_not_allowed" };
  }

  if (usage.seenClientOrderIds.includes(order.clientOrderId)) {
    return { allowed: false, reason: "duplicate_client_order_id" };
  }

  const notional = estimateOrderNotional(order);
  if (notional > envelope.maxNotionalPerOrder) {
    return { allowed: false, reason: "notional_per_order_exceeded" };
  }

  if (usage.notionalUsedToday + notional > envelope.maxNotionalPerDay) {
    return { allowed: false, reason: "notional_per_day_exceeded" };
  }

  if (usage.openOrderCount >= envelope.maxOpenOrders) {
    return { allowed: false, reason: "open_orders_exceeded" };
  }

  const maxQty = envelope.maxPositionQty[order.symbol];
  const held = usage.positionQty[order.symbol] ?? 0;
  if (maxQty != null && held + order.qty > maxQty) {
    return { allowed: false, reason: "position_qty_exceeded" };
  }

  // Leverage vs margin account — P7 portfolio plugin (stub: type field only).

  if (checkRate && usage.rateBucket) {
    const bucket = consumeRateToken({
      state: usage.rateBucket,
      envelope,
      nowMs: Date.parse(usage.clockIso),
    });
    if (!bucket.result.allowed) {
      return bucket.result;
    }
  }

  return { allowed: true };
}

/** Enqueue gate — may return next rate bucket state for write path. */
export function validateEnqueueAgainstEnvelope(input: {
  action: CandidateAction;
  envelope: RiskEnvelope;
  usage: EnvelopeUsageSnapshot;
}): {
  veto: RiskEnvelopeVetoResult;
  nextRateBucket?: EnvelopeUsageSnapshot["rateBucket"];
} {
  if (!input.usage.rateBucket) {
    return {
      veto: validateActionAgainstEnvelope({
        ...input,
        checkRate: false,
      }),
    };
  }

  const veto = validateActionAgainstEnvelope({
    action: input.action,
    envelope: input.envelope,
    usage: input.usage,
    checkRate: false,
  });
  if (!veto.allowed) {
    return { veto };
  }

  const bucket = consumeRateToken({
    state: input.usage.rateBucket,
    envelope: input.envelope,
    nowMs: Date.parse(input.usage.clockIso),
  });

  return {
    veto: bucket.result,
    nextRateBucket: bucket.nextState,
  };
}
