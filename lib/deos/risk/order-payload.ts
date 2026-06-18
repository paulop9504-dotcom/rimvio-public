import type {
  ExecutionPlane,
  OrderPayload,
  OrderSide,
  OrderType,
  TradingOrderActionKind,
} from "@/lib/deos/risk/risk-envelope-types";
import { TRADING_ORDER_ACTION_KINDS } from "@/lib/deos/risk/risk-envelope-types";

export function isTradingOrderKind(
  kind: string
): kind is TradingOrderActionKind {
  return (TRADING_ORDER_ACTION_KINDS as readonly string[]).includes(kind);
}

export function parseOrderPayload(
  payload: Record<string, unknown>
): OrderPayload | null {
  const clientOrderId = String(payload.clientOrderId ?? "").trim();
  const symbol = String(payload.symbol ?? "").trim();
  const side = payload.side as OrderSide;
  const qty = Number(payload.qty);
  const orderType = payload.orderType as OrderType;
  const plane = payload.plane as ExecutionPlane;

  if (!clientOrderId || !symbol || !Number.isFinite(qty) || qty <= 0) {
    return null;
  }
  if (side !== "BUY" && side !== "SELL" && side !== "SHORT") {
    return null;
  }
  if (
    orderType !== "LIMIT" &&
    orderType !== "MARKET" &&
    orderType !== "IOC" &&
    orderType !== "FOK"
  ) {
    return null;
  }
  if (
    plane !== "interactive" &&
    plane !== "quant_live" &&
    plane !== "hft_live" &&
    plane !== "paper" &&
    plane !== "backtest"
  ) {
    return null;
  }

  const limitPrice =
    payload.limitPrice != null ? Number(payload.limitPrice) : undefined;

  return {
    clientOrderId,
    symbol,
    side,
    qty,
    limitPrice:
      limitPrice != null && Number.isFinite(limitPrice) ? limitPrice : undefined,
    orderType,
    timeInForce:
      payload.timeInForce != null
        ? String(payload.timeInForce)
        : undefined,
    strategyId:
      payload.strategyId != null ? String(payload.strategyId) : undefined,
    signalId:
      payload.signalId != null ? String(payload.signalId) : undefined,
    plane,
  };
}

/** Notional estimate for limit checks (stub: limit price or 0 for market). */
export function estimateOrderNotional(order: OrderPayload): number {
  const price = order.limitPrice ?? 0;
  return order.qty * price;
}
