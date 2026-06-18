import { NextResponse, type NextRequest } from "next/server";
import { injectProducts } from "@/lib/product-injector/inject-products";
import type { ProductInjectorContext } from "@/lib/product-injector/types";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 15;
export const runtime = "nodejs";

type ProductInjectRequest = {
  user_intent?: string;
  query?: string;
  context?: ProductInjectorContext;
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);

  let body: ProductInjectRequest = {};
  try {
    body = (await request.json()) as ProductInjectRequest;
  } catch {
    body = {};
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  try {
    const result = await injectProducts({
      user_intent: body.user_intent?.trim() || "product_search",
      query,
      context: body.context,
    });

    logApi("info", "product_inject_ok", {
      route: "/api/commerce/product-inject",
      method: "POST",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: String(result.products.length),
    });

    return NextResponse.json({
      intent: result.intent,
      ...(result.emotional_routing ?? {
        emotion: "neutral",
        strategy: "standard_recommend",
        recommended_products: [],
      }),
      selected_product: result.selected_product
        ? {
            name: result.selected_product.name,
            reason: result.selected_product.reason,
            confidence: result.selected_product.confidence,
            fallback_hidden: true,
            source_url: result.selected_product.source_url,
            price: result.selected_product.price,
          }
        : null,
      candidate_count: result.products.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product inject failed.";

    logApi("warn", "product_inject_failed", {
      route: "/api/commerce/product-inject",
      method: "POST",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
