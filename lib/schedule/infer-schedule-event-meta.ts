import type {
  ScheduleEventBlock,
  ScheduleEventPriority,
} from "@/lib/schedule/schedule-block-types";
import type { VitalityTag } from "@/lib/vitality/types";
import {
  classifyVitalityByPurpose,
  isSoloPersonalCareActivity,
} from "@/lib/vitality/classify-vitality-purpose";

const VITALITY_KEEP_WEIGHT: Record<VitalityTag, number> = {
  Nexus: 40,
  Apex: 38,
  Sentinel: 35,
  Haven: 20,
};

const DEFAULT_RESCHEDULE_COST: Record<VitalityTag, number> = {
  Haven: 22,
  Nexus: 58,
  Apex: 52,
  Sentinel: 45,
};

const DEFAULT_DURATION_MIN: Record<VitalityTag, number> = {
  Haven: 60,
  Nexus: 60,
  Apex: 45,
  Sentinel: 30,
};

export function inferVitalityFromText(text: string): VitalityTag {
  return classifyVitalityByPurpose(text);
}

export function inferPriorityFromText(text: string): ScheduleEventPriority {
  if (/중요|긴급|필수|꼭|must|critical|vip/u.test(text)) {
    return "high";
  }
  if (/(?:가능하면|여유|천천히)/u.test(text)) {
    return "low";
  }
  return "normal";
}

export function inferDurationMinutes(title: string, vitality: VitalityTag): number {
  if (/헤어|미용|염색|펌/u.test(title)) {
    return 75;
  }
  if (/점심|식사|저녁|밥/u.test(title)) {
    return 75;
  }
  if (/커피|카페/u.test(title)) {
    return 45;
  }
  if (/미팅|회의/u.test(title)) {
    return 60;
  }
  return DEFAULT_DURATION_MIN[vitality];
}

export function inferRescheduleCost(
  title: string,
  vitality: VitalityTag,
  priority: ScheduleEventPriority
): number {
  let cost = DEFAULT_RESCHEDULE_COST[vitality];
  if (/예약금|노쇼|당일\s*취소|위약/u.test(title)) {
    cost += 25;
  }
  if (priority === "high") {
    cost += 12;
  }
  if (priority === "low" || isSoloPersonalCareActivity(title)) {
    cost -= 8;
  }
  return Math.min(100, Math.max(5, cost));
}

export function computeKeepScore(event: ScheduleEventBlock): number {
  const base = VITALITY_KEEP_WEIGHT[event.vitality];
  const priorityBonus =
    event.priority === "high" ? 25 : event.priority === "low" ? -5 : 0;
  return base + priorityBonus + event.rescheduleCost * 0.35;
}

export function buildScheduleEventBlock(input: {
  id: string;
  title: string;
  startMinutes: number;
  contextText: string;
  source: ScheduleEventBlock["source"];
}): ScheduleEventBlock {
  const vitality = inferVitalityFromText(`${input.title} ${input.contextText}`);
  const priority = inferPriorityFromText(input.contextText);
  const durationMinutes = inferDurationMinutes(input.title, vitality);

  return {
    id: input.id,
    title: input.title.trim(),
    startMinutes: input.startMinutes,
    durationMinutes,
    vitality,
    priority,
    rescheduleCost: inferRescheduleCost(input.title, vitality, priority),
    source: input.source,
  };
}
