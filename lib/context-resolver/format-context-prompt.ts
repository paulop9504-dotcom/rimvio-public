import { resolveDynamicContext } from "@/lib/context-resolver/resolve-context";
import type { ContextSnapshot, PersistentEvent } from "@/lib/context-resolver/types";

export function formatWeatherContextLine(weather: ContextSnapshot["weather"]): string {
  const temp = weather.temp_c != null ? `${weather.temp_c}°C` : "—";
  const unpleasant = weather.is_unpleasant ? " (불쾌/이동 부담)" : "";
  return `- 날씨: ${weather.summary} / ${weather.condition_label ?? weather.condition} ${temp}${unpleasant}`;
}

export function formatContextSnapshotBlock(snapshot: ContextSnapshot): string {
  const lines = [
    "# [JIT_CONTEXT]",
    "현재 상황 (실행 직전 조회 — 등록 시점 값 아님):",
    formatWeatherContextLine(snapshot.weather),
    `- 교통: 이동 약 ${snapshot.traffic.travel_minutes}분, 지연 ${snapshot.traffic.delay_minutes}분`,
    `- 위치: ${snapshot.location.label}`,
    `- 일정까지: ${snapshot.calendar.minutes_until_event}분`,
    "",
    "[지침]",
    "날씨가 나쁘면(비·폭염·is_unpleasant) 걷기보다 택시·대중교통·실내 경로를 우선 추천하라.",
    "교통 지연이 크면 출발 시각을 앞당기는 액션을 고려하라.",
  ];

  return lines.join("\n");
}

export async function buildDynamicContextPromptBlock(input: {
  event: PersistentEvent;
}): Promise<string> {
  const snapshot = await resolveDynamicContext({ event: input.event });
  return formatContextSnapshotBlock(snapshot);
}

export function extractLocationHintFromMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const placeMatch = trimmed.match(
    /([가-힣A-Za-z0-9]+(?:역|점|지점|본점|센터|빌딩|타워|호텔|공항|미팅|회의|미팅장)?)/ 
  );

  const travelMatch = trimmed.match(
    /(?:까지|에서|으로|로)\s*([가-힣A-Za-z0-9\s]+(?:역|점|동|구|시)?)/ 
  );

  return travelMatch?.[1]?.trim() ?? placeMatch?.[1]?.trim() ?? null;
}
