import { detectScheduleConflict } from "@/lib/schedule/day-schedule";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type {
  ConflictKind,
  IntentExpansion,
  ScheduleResolution,
  SchedulingConflictAnalysis,
} from "@/lib/testing/unified-stress/types";

const ENERGY_HEAVY = /(?:운동|헬스|공부|수능|회의|프로젝트)/u;
const ENERGY_LIGHT = /(?:카페|산책|휴식|쉬)/u;
const HIGH_PRIORITY = /(?:면접|병원|약속|마감|회의|시험)/u;

function inferProposedFromIntent(
  expansion: IntentExpansion,
  proposed?: ExistingScheduleInput
): ExistingScheduleInput {
  if (proposed?.length) return proposed;
  const label =
    expansion.domainMapping.includes("exercise")
      ? "운동"
      : expansion.domainMapping.includes("work")
        ? "공부"
        : expansion.domainMapping.includes("food")
          ? "식사"
          : "새 일정";
  return [{ time: "18:00", task: label }];
}

function detectEnergyConflict(
  proposed: ExistingScheduleInput,
  existing: ExistingScheduleInput
): boolean {
  const proposedHeavy = proposed.some((p) => ENERGY_HEAVY.test(p.task));
  const existingHeavy = existing.some((e) => ENERGY_HEAVY.test(e.task));
  const proposedLight = proposed.some((p) => ENERGY_LIGHT.test(p.task));
  return (proposedHeavy && existingHeavy) || (proposedHeavy && proposedLight);
}

function detectPriorityConflict(
  proposed: ExistingScheduleInput,
  existing: ExistingScheduleInput
): boolean {
  const proposedHigh = proposed.some((p) => HIGH_PRIORITY.test(p.task));
  const existingHigh = existing.some((e) => HIGH_PRIORITY.test(e.task));
  return proposedHigh && existingHigh;
}

function buildResolutions(
  kinds: ConflictKind[],
  affected: string[]
): ScheduleResolution[] {
  const resolutions: ScheduleResolution[] = [];

  if (kinds.includes("HARD")) {
    resolutions.push({
      strategy: "RESCHEDULE",
      summary: "겹치는 시간대를 30분 이상 비워 재배치",
      impact: affected.join(", "),
    });
    resolutions.push({
      strategy: "SPLIT",
      summary: "집중 작업과 가벼운 일정을 시간대별로 분리",
      impact: "에너지 소모 분산",
    });
  }

  if (kinds.includes("SOFT")) {
    resolutions.push({
      strategy: "DEFER",
      summary: "우선순위 낮은 일정을 내일/다음 슬롯으로 미루기",
      impact: "피로·집중 충돌 완화",
    });
    resolutions.push({
      strategy: "MERGE",
      summary: "인접 일정을 하나의 블록으로 합치기",
      impact: "이동·전환 비용 감소",
    });
  }

  if (kinds.includes("OPTIONAL")) {
    resolutions.push({
      strategy: "DROP",
      summary: "선택 일정 중 하나를 취소",
      impact: "여유 확보",
    });
  }

  return resolutions.slice(0, 3);
}

function recommendAction(
  kinds: ConflictKind[],
  resolutions: ScheduleResolution[]
): string {
  if (kinds.includes("HARD")) {
    return resolutions.find((r) => r.strategy === "RESCHEDULE")?.summary ?? "재배치 권장";
  }
  if (kinds.includes("SOFT")) {
    return resolutions.find((r) => r.strategy === "DEFER")?.summary ?? "미루기 권장";
  }
  return "충돌 없음 — 그대로 진행 가능";
}

/**
 * Detect schedule conflicts and propose 2–3 resolution strategies.
 */
export function resolveSchedulingConflict(input: {
  expansion: IntentExpansion;
  existingSchedule: ExistingScheduleInput;
  proposedSchedule?: ExistingScheduleInput;
}): SchedulingConflictAnalysis {
  const proposed = inferProposedFromIntent(input.expansion, input.proposedSchedule);
  const existing = input.existingSchedule;

  const { isConflict, overlaps } = detectScheduleConflict({
    proposed,
    existing,
    bufferMinutes: 30,
  });

  const kinds: ConflictKind[] = [];
  const affectedExisting = overlaps.map((o) => `${o.existing.time} ${o.existing.task}`);

  if (isConflict) kinds.push("HARD");
  if (detectEnergyConflict(proposed, existing)) kinds.push("SOFT");
  if (detectPriorityConflict(proposed, existing)) kinds.push("SOFT");
  if (!isConflict && existing.length > 4) kinds.push("OPTIONAL");

  const resolutions = buildResolutions(kinds, affectedExisting);

  return {
    conflictDetected: kinds.length > 0,
    conflictKinds: kinds,
    affectedExisting: [...new Set(affectedExisting)],
    resolutions,
    recommendedAction: recommendAction(kinds, resolutions),
  };
}
