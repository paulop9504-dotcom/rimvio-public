import type { ActionSpawnPhase, SpawnPhaseInput, SpawnPhaseResult } from "@/lib/action-spawn/types";

function isMeetingLike(title: string): boolean {
  return /(?:미팅|회의|meeting|파트너|외부|강남)/iu.test(title);
}

function isGymLike(title: string): boolean {
  return /(?:헬스|PT|피티|운동|gym|fitness)/iu.test(title);
}

function isMorningHour(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 6 && hour < 11;
}

function isCommuteHour(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 17 && hour < 21;
}

function extractPlace(title: string, location?: string | null): string | null {
  if (location?.trim()) {
    return location.trim();
  }
  const match = title.match(/(?:강남역|역|공항|병원|헬스장)[^\s,]*/u);
  return match?.[0] ?? null;
}

/**
 * Resolve which lifecycle phase is active — drives aux set swap (travel → on_site).
 */
export function resolveLifecycleSpawnPhase(
  input: SpawnPhaseInput,
  now = new Date(),
): SpawnPhaseResult {
  const minutes = input.minutes_until_event ?? null;
  const place = extractPlace(input.title, input.location);
  const context_lines: string[] = [];

  if (isMorningHour(now) && minutes != null && minutes > 60) {
    context_lines.push("오늘 오전 일정을 확인했어요");
  }

  if (isMeetingLike(input.title)) {
    if (input.proximity === "at_venue" || (minutes != null && minutes <= 10 && minutes >= -30)) {
      return {
        phase: "on_site",
        prompt_hint: place ? `${place} 도착 · 현장 준비` : "현장 준비",
        context_lines: [
          ...context_lines,
          place ? `${place} 도착을 확인했어요` : "미팅 장소에 도착했어요",
        ],
      };
    }

    if (minutes != null && minutes > 10 && minutes <= 120) {
      return {
        phase: "travel",
        prompt_hint: "이동해야 할 시간입니다",
        context_lines: [
          ...context_lines,
          place
            ? `현재 위치에서 ${place}까지 이동 시간을 계산했어요`
            : "이동 시간을 확인했어요",
        ],
      };
    }
  }

  if (isGymLike(input.title) || (isCommuteHour(now) && isGymLike(input.title))) {
    return {
      phase: "prep",
      prompt_hint: "운동 전 준비",
      context_lines: [
        ...context_lines,
        "퇴근길 · 저녁 식사와 운동 준비",
      ],
    };
  }

  if (isMorningHour(now) && context_lines.length > 0) {
    return { phase: "day_start", context_lines };
  }

  return { phase: "default", context_lines };
}

export function shouldHideAuxForPhase(
  phase: ActionSpawnPhase,
  plugin: string | null | undefined,
): boolean {
  if (phase !== "on_site") {
    return false;
  }
  return plugin === "kakao.taxi" || plugin === "navigation";
}
