/**
 * Risk Envelope — constraint-only (no decision authority).
 * @see docs/PLATFORM_OS_ARCHITECTURE.md §14.3
 */

export const RISK_ENVELOPE_VERSION = "risk-envelope-v1";

/** Planes that may carry a signed mandate envelope. */
export type MandatePlane = "quant_live" | "hft_live" | "paper";

export type ExecutionPlane =
  | "interactive"
  | MandatePlane
  | "backtest";

export type KillSwitchState = "ARMED" | "TRIPPED";

export type OrderSide = "BUY" | "SELL" | "SHORT";

export type OrderType = "LIMIT" | "MARKET" | "IOC" | "FOK";

/** L4 trading action kinds (stub — execution router P6+). */
export type TradingOrderActionKind =
  | "order_place_limit"
  | "order_place_market"
  | "order_replace"
  | "order_cancel"
  | "order_cancel_all"
  | "position_flatten"
  | "strategy_pause"
  | "strategy_resume";

export const TRADING_ORDER_ACTION_KINDS: readonly TradingOrderActionKind[] = [
  "order_place_limit",
  "order_place_market",
  "order_replace",
  "order_cancel",
  "order_cancel_all",
  "position_flatten",
  "strategy_pause",
  "strategy_resume",
] as const;

/** Allowed while kill switch is TRIPPED (risk reduction only). */
export const KILL_SWITCH_EXEMPT_KINDS: readonly TradingOrderActionKind[] = [
  "strategy_pause",
  "order_cancel_all",
  "position_flatten",
  "order_cancel",
] as const;

/**
 * Human-signed mandate box — L3 console creates/updates; strategies never mutate.
 */
export type RiskEnvelope = {
  envelopeId: string;
  scopeId: string;
  plane: MandatePlane;
  strategyId?: string;
  signedAt: string;
  expiresAt: string;
  allowedSymbols: string[];
  maxNotionalPerOrder: number;
  maxNotionalPerDay: number;
  maxOpenOrders: number;
  maxPositionQty: Record<string, number>;
  maxLeverage: number;
  orderRatePerSec: number;
  allowedSides: OrderSide[];
  allowedOrderTypes: OrderType[];
  killSwitch: KillSwitchState;
  version?: typeof RISK_ENVELOPE_VERSION;
};

/** Router/order payload (UX never reads). */
export type OrderPayload = {
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  limitPrice?: number;
  orderType: OrderType;
  timeInForce?: string;
  strategyId?: string;
  signalId?: string;
  plane: ExecutionPlane;
};

/** Caller-supplied usage — pure validators do not mutate. */
export type EnvelopeUsageSnapshot = {
  clockIso: string;
  notionalUsedToday: number;
  openOrderCount: number;
  positionQty: Record<string, number>;
  seenClientOrderIds: string[];
  rateBucket?: RiskEnvelopeRateBucketState;
};

export type RiskEnvelopeRateBucketState = {
  tokens: number;
  lastRefillMs: number;
};

export type RiskEnvelopeVetoReason =
  | "envelope_expired"
  | "envelope_scope_mismatch"
  | "kill_switch_tripped"
  | "symbol_not_allowed"
  | "side_not_allowed"
  | "order_type_not_allowed"
  | "notional_per_order_exceeded"
  | "notional_per_day_exceeded"
  | "open_orders_exceeded"
  | "position_qty_exceeded"
  | "leverage_exceeded"
  | "rate_limit_exceeded"
  | "duplicate_client_order_id"
  | "plane_mismatch"
  | "invalid_order_payload"
  | "not_trading_action";

export type RiskEnvelopeVetoResult = {
  allowed: boolean;
  reason?: RiskEnvelopeVetoReason;
};
