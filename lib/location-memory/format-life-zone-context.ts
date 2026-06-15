import type { LifeZoneInference, LocationMemoryWire } from "@/lib/location-memory/types";
import { inferLifeZoneFromActivities } from "@/lib/location-memory/infer-life-zone";

export function buildLocationMemoryWire(input: {
  recentActivities: LocationMemoryWire["recentActivities"];
}): LocationMemoryWire {
  return {
    recentActivities: input.recentActivities,
    lifeZone: inferLifeZoneFromActivities(input.recentActivities),
  };
}

export function formatLifeZoneContextBlock(
  memory: LocationMemoryWire | null | undefined
): string | null {
  if (!memory?.lifeZone) {
    return null;
  }

  const zone: LifeZoneInference = memory.lifeZone;
  const historyLines = memory.recentActivities.slice(0, 6).map((entry) => {
    const date = entry.createdAt.slice(0, 10);
    return `- ${date}: ${entry.query}`;
  });

  return [
    "# [LIFE_ZONE_CONTEXT]",
    "Stage 2 — personalized origin inference (transparent):",
    ...historyLines,
    "",
    `추론된 주 생활권: ${zone.label} (confidence ${Math.round(zone.confidence * 100)}%)`,
    `투명 멘트(답변에 반영): ${zone.transparent_line}`,
    "[지침]",
    "- 출발지(origin)가 없으면 위 생활권을 출발지 후보로 사용하라.",
    "- 반드시 어떤 검색 기록을 근거로 했는지 한 문장으로 밝혀라.",
    "- confidence가 낮으면 추정치임을 분명히 하고 확인 질문을 덧붙여라.",
  ].join("\n");
}
