import type { EventCandidateLifecycle } from "@/lib/events/event-candidate";

export type EventOpportunityPriority = "HIGH" | "MEDIUM" | "LOW";

/** Ranked opportunity signal for Dock / Timeline UI — read-only projection. */
export type EventOpportunitySignal = {
  ecId: string;
  score: number;
  reason: string;
  priority: EventOpportunityPriority;
};

/** Optional UI context — must NOT be used as event source. */
export type OpportunityEngineContext = {
  now?: Date;
  /** ec-id currently focused in Dock / Timeline selection */
  focusedEcId?: string | null;
  /** ec-ids recently interacted with (Dock taps, etc.) */
  recentEcIds?: readonly string[];
  maxResults?: number;
};

/** Lifecycles eligible for opportunity scoring — excludes archived/candidate. */
export const SCORABLE_LIFECYCLES = new Set<EventCandidateLifecycle>([
  "mentioned",
  "confirmed",
  "scheduled",
  "active",
  "completed",
]);

export const LIFECYCLE_URGENCY: Record<EventCandidateLifecycle, number> = {
  mentioned: 0.25,
  candidate: 0,
  confirmed: 0.45,
  scheduled: 0.65,
  active: 1,
  completed: 0.15,
  archived: 0,
};

export const PRIORITY_THRESHOLDS = {
  high: 0.72,
  medium: 0.42,
} as const;
