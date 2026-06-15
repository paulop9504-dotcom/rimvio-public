import { NextResponse, type NextRequest } from "next/server";
import { runHybridRetrievalPublic } from "@/lib/hybrid-retrieval/run-hybrid-retrieval";
import type { HybridRetrievalContext } from "@/lib/hybrid-retrieval/types";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 20;
export const runtime = "nodejs";

type HybridRetrievalRequest = {
  user_query?: string;
  context?: HybridRetrievalContext;
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);

  let body: HybridRetrievalRequest = {};
  try {
    body = (await request.json()) as HybridRetrievalRequest;
  } catch {
    body = {};
  }

  const user_query = body.user_query?.trim();
  if (!user_query) {
    return NextResponse.json({ error: "Missing user_query." }, { status: 400 });
  }

  try {
    const result = await runHybridRetrievalPublic({
      user_query,
      context: body.context,
    });

    if (!result) {
      return NextResponse.json({ error: "No actionable results." }, { status: 404 });
    }

    logApi("info", "hybrid_retrieval_ok", {
      route: "/api/retrieval/hybrid",
      method: "POST",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: result.intent,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hybrid retrieval failed.";

    logApi("warn", "hybrid_retrieval_failed", {
      route: "/api/retrieval/hybrid",
      method: "POST",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
