import { NextResponse } from "next/server";
import {
  buildRuleBasedMorningBriefing,
  formatMorningBriefingText,
} from "@/lib/morning-orchestrator/parse-morning-response";
import { resolveMorningContext } from "@/lib/morning-orchestrator/resolve-morning-context";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location") ?? "Seoul";
  const toneParam = url.searchParams.get("tone");
  const tone = toneParam === "jarvis" ? "jarvis" : "partner";

  const bundle = await resolveMorningContext({
    message: tone === "jarvis" ? "자비스 현황 보고" : "아침 브리핑",
    location,
    tone,
  });

  const wire = buildRuleBasedMorningBriefing(bundle);

  return NextResponse.json({
    wire,
    text: formatMorningBriefingText(wire),
    context: bundle,
  });
}
