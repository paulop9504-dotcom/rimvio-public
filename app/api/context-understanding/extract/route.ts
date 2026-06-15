import { NextResponse } from "next/server";
import { extractContextUnderstanding } from "@/lib/context-understanding/extract-context-understanding";
import { extractContextUnderstandingViaLlm } from "@/lib/context-understanding/extract-context-understanding-llm";
import type { ContextUnderstandingInput } from "@/lib/context-understanding/types";

type ExtractBody = ContextUnderstandingInput & {
  use_llm?: boolean;
};

/**
 * POST /api/context-understanding/extract
 * Semantic layer only — input signal for Event Compiler (no timing/UI/execution).
 */
export async function POST(request: Request) {
  let body: ExtractBody;

  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: ContextUnderstandingInput = {
    message: body.message,
    system_context: body.system_context,
    clock: body.clock ? new Date(body.clock) : undefined,
  };

  if (body.use_llm) {
    const result = await extractContextUnderstandingViaLlm(input);
    return NextResponse.json({
      wire: result.wire,
      source: result.source,
      layer: "context-understanding",
    });
  }

  const wire = extractContextUnderstanding(input);
  return NextResponse.json({
    wire,
    source: "rules",
    layer: "context-understanding",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    layer: "context-understanding",
    role: "semantic interpretation only",
    forbidden: [
      "event timing",
      "ui appearance",
      "main_aux selection",
      "execution",
      "final schedules",
    ],
    downstream: "event-compiler",
  });
}
