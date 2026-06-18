import type { VitalityTag } from "@/lib/vitality/types";

export type ScheduleEventPriority = "high" | "normal" | "low";

export type ScheduleEventBlock = {
  id: string;
  title: string;
  /** Minutes from midnight (local). */
  startMinutes: number;
  durationMinutes: number;
  vitality: VitalityTag;
  priority: ScheduleEventPriority;
  /** 0–100 — higher = harder to reschedule. */
  rescheduleCost: number;
  source: "message" | "existing" | "inferred";
};

export type ScheduleBlockOverlap = {
  eventA: ScheduleEventBlock;
  eventB: ScheduleEventBlock;
  overlapMinutes: number;
};

export type ScheduleAdvisoryRecommendation = "move_a" | "move_b" | "manual";

export type ScheduleAdvisoryOption = {
  label: string;
  prompt: string;
  targetEventId: string;
};

export type ScheduleAdvisoryWire = {
  recommendation: ScheduleAdvisoryRecommendation;
  recommendedEventId: string;
  otherEventId: string;
  summary: string;
  reason: string;
  events: [ScheduleEventBlock, ScheduleEventBlock];
  overlap: ScheduleBlockOverlap;
  options: ScheduleAdvisoryOption[];
};
