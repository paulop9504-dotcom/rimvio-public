import type { RankedSurface, SurfaceBuildContext } from "@/lib/surface-engine/surface-contract";
import { bandFromScore } from "@/lib/surface-engine/surface-priority";
import type { SurfaceUxState } from "@/lib/surface-engine/surface-ux-state";
import { FALLBACK_SURFACE_PREFIX } from "@/lib/surface-engine/surface-ux-state";

const START_HERE_ID = `${FALLBACK_SURFACE_PREFIX}start-here`;
const IDLE_ID = `${FALLBACK_SURFACE_PREFIX}idle`;

function localHour(now: Date): number {
  return now.getHours();
}

function isWeekend(now: Date): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

/** Time-based copy — universal patterns, no user prefs. */
export function timeBasedFallbackDescription(now: Date, uxState: SurfaceUxState): string {
  const hour = localHour(now);
  if (uxState === "idle") {
    return "지금은 특별히 급한 건 없습니다. 가볍게 시작할 수 있는 다음 단계예요.";
  }
  if (isWeekend(now)) {
    return "주말에는 여유 있게 개인 일정과 목표를 살보면 좋아요.";
  }
  if (hour >= 5 && hour < 11) {
    return "아침에는 오늘 일정과 이동을 먼저 확인하면 하루가 편해져요.";
  }
  if (hour >= 17 && hour < 23) {
    return "저녁에는 오늘을 정리하고 내일을 가볍게 준비하면 돼요.";
  }
  return "다음에 할 일을 한 가지씩 이어가면 됩니다.";
}

function rankedFallback(input: {
  id: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryCapability: RankedSurface["primaryAction"]["capabilityId"];
  secondary: RankedSurface["secondaryActions"];
  score: number;
  visibility: RankedSurface["visibility"];
}): RankedSurface {
  const score = input.score;
  return {
    id: input.id,
    type: "generic",
    title: input.title,
    description: input.description,
    primaryAction: {
      id: `${input.id}:${input.primaryCapability}`,
      kind: "primary",
      label: input.primaryLabel,
      capabilityId: input.primaryCapability,
    },
    secondaryActions: input.secondary,
    people: [],
    resources: [],
    events: [],
    narration: {
      summary: "다음 단계를 바로 실행할 수 있어요",
      reason: "ux_fallback",
    },
    priority: {
      band: bandFromScore(score),
      surfacePriorityScore: score,
    },
    visibility: input.visibility,
    lifecycle: "active",
  };
}

/** Universal safety net — always available. */
export function buildStartHereSurface(
  now: Date,
  uxState: SurfaceUxState = "empty",
): RankedSurface {
  return rankedFallback({
    id: START_HERE_ID,
    title: "시작하기",
    description: timeBasedFallbackDescription(now, uxState),
    primaryLabel: "오늘 일정 확인",
    primaryCapability: "CALENDAR",
    secondary: [
      {
        id: `${START_HERE_ID}:SEARCH`,
        kind: "secondary",
        label: "최근 활동 보기",
        capabilityId: "SEARCH",
      },
      {
        id: `${START_HERE_ID}:CLARIFY_GOAL`,
        kind: "secondary",
        label: "목표/진행 상태 보기",
        capabilityId: "CLARIFY_GOAL",
      },
    ],
    score: 52,
    visibility: "prominent",
  });
}

/** Idle starting point — one surface, one primary direction. */
export function buildIdleStarterSurface(now: Date, context: SurfaceBuildContext): RankedSurface {
  void context;
  return rankedFallback({
    id: IDLE_ID,
    title: "지금은 특별히 급한 건 없습니다",
    description: timeBasedFallbackDescription(now, "idle"),
    primaryLabel: "오늘 일정 확인",
    primaryCapability: "CALENDAR",
    secondary: [
      {
        id: `${IDLE_ID}:ALARM`,
        kind: "secondary",
        label: "10분 운동 시작",
        capabilityId: "ALARM",
      },
      {
        id: `${IDLE_ID}:SEARCH`,
        kind: "secondary",
        label: "최근 활동 보기",
        capabilityId: "SEARCH",
      },
    ],
    score: 48,
    visibility: "prominent",
  });
}

export function hasStartHereSurface(surfaces: readonly RankedSurface[]): boolean {
  return surfaces.some((row) => row.id === START_HERE_ID);
}
