import type { ScheduleEventBlock } from "@/lib/schedule/schedule-block-types";

export type ScheduleReminderWire = {
  id: string;
  title: string;
  fireAt: string;
  url?: string;
};

export type ScheduleRecord = {
  id: string;
  title: string;
  fireAt: string;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  url?: string;
};

export type ScheduleQueryTier = "retrieval" | "conflict" | "goal";

export type ScheduleQueryKind =
  | "time_range"
  | "week_tasks"
  | "person_search"
  | "overlap_priority"
  | "departure_time"
  | "reschedule_propagation"
  | "revenue_alignment"
  | "study_block"
  | "productivity_score";

export type ScheduleQueryAnalysis = {
  tier: ScheduleQueryTier;
  kind: ScheduleQueryKind;
  label: string;
  /** YYYY-MM-DD */
  dateKey?: string;
  /** minutes from midnight */
  rangeStartMinutes?: number;
  rangeEndMinutes?: number;
  personName?: string;
  destination?: string;
  meetingMinutes?: number;
  delayMinutes?: number;
  eventLabelA?: string;
  eventLabelB?: string;
  revenueTarget?: number;
  certificationLabel?: string;
  studyMonth?: number;
};

export type ScheduleRetrievalItem = {
  dateKey: string;
  time: string;
  title: string;
  source?: "calendar" | "reminder" | "activity_feed" | "notification";
  note?: string;
};

export type ScheduleActivityWire = {
  id: string;
  title: string;
  text: string;
  timestamp: string;
  fireAt?: string | null;
  source: "activity_feed" | "notification_shadow" | "search_activity";
};

export type DeepRetrievalStage = 1 | 2 | 3 | 4;

export type ScheduleRetrievalWire = {
  kind: ScheduleQueryKind;
  queryLabel: string;
  items: ScheduleRetrievalItem[];
  retrievalStage?: DeepRetrievalStage;
  userInLoop?: boolean;
  emptyMessage?: string;
};

export type ReschedulePropagationWire = {
  shiftedEventId: string;
  shiftedTitle: string;
  delayMinutes: number;
  revised: Array<{ dateKey: string; time: string; title: string; note?: string }>;
};

export type DepartureAdviceWire = {
  destination: string;
  meetingTime: string;
  leaveBy: string;
  travelMinutes: number;
  delayMinutes: number;
  bufferMinutes: number;
  summary: string;
};

export type GoalAlignmentWire = {
  kind: ScheduleQueryKind;
  score?: number;
  summary: string;
  suggestions: string[];
  studyBlocks?: Array<{ dateKey: string; time: string; label: string }>;
  cutCandidates?: string[];
  boostCandidates?: string[];
};

export type ScheduleIntelligenceContext = {
  referenceDate: string;
  reminders: ScheduleReminderWire[];
  goals?: import("@/lib/goal-roadmap/types").UserGoalWire[];
  /** Stage 3 — activity feed + notification shadow (client snapshot; preferred when newer) */
  activitySources?: ScheduleActivityWire[];
};

export type NamedEventPair = {
  eventA: ScheduleEventBlock;
  eventB: ScheduleEventBlock;
};
