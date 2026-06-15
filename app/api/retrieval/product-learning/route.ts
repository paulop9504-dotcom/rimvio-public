import { NextResponse, type NextRequest } from "next/server";
import { runProductSelfLearningLoop } from "@/lib/product-self-learning/run-product-learning-loop";
import type { ProductLearningInput } from "@/lib/product-self-learning/types";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);

  let body: ProductLearningInput;
  try {
    body = (await request.json()) as ProductLearningInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.impression_log)) {
    return NextResponse.json({ error: "Missing impression_log array." }, { status: 400 });
  }

  try {
    const result = runProductSelfLearningLoop({
      impression_log: body.impression_log ?? [],
      click_log: body.click_log ?? [],
      dwell_time: body.dwell_time ?? [],
      conversion_log: body.conversion_log ?? [],
      current_weights: body.current_weights,
      learning_rate: body.learning_rate,
      drop_threshold: body.drop_threshold,
      emerge_threshold: body.emerge_threshold,
      expectation: body.expectation,
      min_impressions_to_drop: body.min_impressions_to_drop,
      now: body.now,
    });

    logApi("info", "product_self_learning_ok", {
      route: "/api/retrieval/product-learning",
      method: "POST",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: result.system_bias_shift,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product self-learning failed.";

    logApi("warn", "product_self_learning_failed", {
      route: "/api/retrieval/product-learning",
      method: "POST",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
