import { NextResponse } from "next/server";

import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";

function normalizePlaceSearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "쿠우쿠우 맛집 추천";
  }
  const enriched = enrichPlaceDiscoveryMessage(trimmed);
  if (parseFindPlaceIntent(enriched)) {
    return enriched;
  }
  return enriched;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev only" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const q = normalizePlaceSearchQuery(searchParams.get("q") ?? "쿠우쿠우 맛집 추천");

  const result = await orchestratePlaceRecommendation(q);

  if (!result) {
    return NextResponse.json({
      ok: false,
      query: q,
      error: "맛집 검색 의도로 인식하지 못했어요. 예: 강남역 스테이크, 쿠우쿠우 추천",
    });
  }

  return NextResponse.json({
    ok: true,
    query: q,
    summary: result.summary,
    thought: result.thought,
    cafeDiscovery: result.cafeDiscovery ?? null,
  });
}
