import { computeKeepScore } from "@/lib/schedule/infer-schedule-event-meta";
import { memoryScheduleKeepBias } from "@/lib/experience/apply-memory-schedule-bias";
import type { ExperienceMode } from "@/lib/experience/types";
import type {
  ScheduleAdvisoryRecommendation,
  ScheduleEventBlock,
} from "@/lib/schedule/schedule-block-types";

export type TradeoffScore = {
  recommendation: ScheduleAdvisoryRecommendation;
  moveEventId: string;
  keepEventId: string;
  reason: string;
  keepScoreA: number;
  keepScoreB: number;
};

export function scoreScheduleTradeoff(
  eventA: ScheduleEventBlock,
  eventB: ScheduleEventBlock,
  experienceMode: ExperienceMode = "BALANCED"
): TradeoffScore {
  const keepA = computeKeepScore(eventA) + memoryScheduleKeepBias(eventA, experienceMode);
  const keepB = computeKeepScore(eventB) + memoryScheduleKeepBias(eventB, experienceMode);

  let moveEventId = eventA.id;
  let keepEventId = eventB.id;

  if (keepA > keepB + 3) {
    moveEventId = eventB.id;
    keepEventId = eventA.id;
  } else if (keepB > keepA + 3) {
    moveEventId = eventA.id;
    keepEventId = eventB.id;
  } else if (eventA.vitality === "Haven" && eventB.vitality !== "Haven") {
    moveEventId = eventA.id;
    keepEventId = eventB.id;
  } else if (eventB.vitality === "Haven" && eventA.vitality !== "Haven") {
    moveEventId = eventB.id;
    keepEventId = eventA.id;
  } else if (eventA.rescheduleCost < eventB.rescheduleCost) {
    moveEventId = eventA.id;
    keepEventId = eventB.id;
  } else {
    moveEventId = eventB.id;
    keepEventId = eventA.id;
  }

  const moveEvent = moveEventId === eventA.id ? eventA : eventB;
  const keepEvent = keepEventId === eventA.id ? eventA : eventB;

  return {
    recommendation: moveEventId === eventA.id ? "move_a" : "move_b",
    moveEventId,
    keepEventId,
    reason: buildReason(moveEvent, keepEvent, keepA, keepB),
    keepScoreA: keepA,
    keepScoreB: keepB,
  };
}

function buildReason(
  moveEvent: ScheduleEventBlock,
  keepEvent: ScheduleEventBlock,
  keepA: number,
  keepB: number
): string {
  const parts = [
    `${keepEvent.title}(${keepEvent.vitality}${keepEvent.priority === "high" ? "·중요" : ""})을(를) 유지하는 편이 낫습니다.`,
    `${moveEvent.title}은(는) 약 ${moveEvent.durationMinutes}분 걸려 ${keepEvent.title}과(와) 시간이 겹칩니다.`,
    `${moveEvent.vitality} 일정은 미루기 비용이 상대적으로 낮습니다.`,
  ];

  if (Math.abs(keepA - keepB) < 4) {
    parts.push("두 일정 모두 조정 가능해 보여요 — 아래에서 골라 주세요.");
  }

  return parts.join(" ");
}

export function appendMemoryModeReason(reason: string, mode: ExperienceMode): string {
  if (mode !== "MEMORY") {
    return reason;
  }
  return `${reason} 함께하는 시간(Nexus)은 가능하면 지키는 쪽이 좋아요.`;
}
