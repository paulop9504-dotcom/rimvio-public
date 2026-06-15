import { NextResponse } from "next/server";
import { extractIntentContext } from "@/lib/intent-context-extractor/extract-intent-context";
import { extractIntentContextViaLlm } from "@/lib/intent-context-extractor/extract-intent-context-llm";
import type { IntentContextExtractInput } from "@/lib/intent-context-extractor/types";

type ExtractBody = IntentContextExtractInput & {
  use_llm?: boolean;
};

/**
 * POST /api/intent-context/extract
 * Semantic layer only — returns candidates, never UI/timing/execution decisions.
 */
export async function POST(request: Request) {
  let body: ExtractBody;

  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: IntentContextExtractInput = {
    message: body.message,
    event: body.event,
    clock: body.clock ? new Date(body.clock) : undefined,
    signals: body.signals,
  };

  if (body.use_llm) {
    const result = await extractIntentContextViaLlm(input);
    return NextResponse.json({
      wire: result.wire,
      source: result.source,
    });
  }

  const wire = extractIntentContext(input);
  return NextResponse.json({
    wire,
    source: "rules",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    layer: "intent-context-extractor",
    decides: [],
    extracts: ["intent", "context", "possible_actions", "secondary_reason_signals"],
  });
}
