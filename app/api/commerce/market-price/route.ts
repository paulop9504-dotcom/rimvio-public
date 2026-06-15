import { NextResponse, type NextRequest } from "next/server";
import { buildMarketPriceSnapshot } from "@/lib/commerce/market-price";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 15;
export const runtime = "nodejs";

type MarketPriceRequest = {
  title?: string;
  domain?: string;
  listingPriceText?: string;
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);

  let body: MarketPriceRequest = {};
  try {
    body = (await request.json()) as MarketPriceRequest;
  } catch {
    body = {};
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Missing title." }, { status: 400 });
  }

  try {
    const snapshot = await buildMarketPriceSnapshot({
      title,
      domain: body.domain ?? null,
      listingPriceText: body.listingPriceText ?? null,
    });

    logApi("info", "market_price_ok", {
      route: "/api/commerce/market-price",
      method: "POST",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: snapshot.available ? "ready" : "partial",
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market price failed.";

    logApi("warn", "market_price_failed", {
      route: "/api/commerce/market-price",
      method: "POST",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
