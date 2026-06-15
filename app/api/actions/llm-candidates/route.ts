import { NextResponse } from "next/server";
import {
  generateActionCandidates,
  generateActionCandidatesSync,
} from "@/lib/llm-action-candidate-generator/generate-action-candidates";
import type { LlmActionCandidateInput } from "@/lib/llm-action-candidate-generator/types";

type Body = LlmActionCandidateInput & {
  ec_id?: string;
  use_llm?: boolean;
};

/**
 * POST /api/actions/llm-candidates
 * Creative action candidate pool (travel/work) — timing/UI still downstream.
 */
export async function POST(request: Request) {
  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Missing title." }, { status: 400 });
  }

  const ecId = body.ec_id?.trim() || "event-adhoc";
  const input: LlmActionCandidateInput = {
    title: body.title,
    location: body.location,
    minutes_until_event: body.minutes_until_event,
    message: body.message,
    spawn_phase: body.spawn_phase,
    domain: body.domain,
  };

  if (body.use_llm) {
    const result = await generateActionCandidates(ecId, input, { use_llm: true });
    return NextResponse.json(result);
  }

  const result = generateActionCandidatesSync(ecId, input);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    layer: "llm-action-candidate-generator",
    domains: ["travel", "work"],
    note: "POST with use_llm:true for OpenAI enrichment; rules always available sync",
  });
}
