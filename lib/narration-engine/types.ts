/** Human-readable reason tags — no internal system names. */
export type NarrationReasonTag =
  | "time_sensitive"
  | "recent_interaction"
  | "high_priority"
  | "medium_priority"
  | "low_priority"
  | "active_now"
  | "scheduled"
  | "in_focus"
  | "dock_display"
  | "timeline_display"
  | "notification_nudge";

export type EventNarration = {
  ecId: string;
  explanation: string;
  reason_tags: NarrationReasonTag[];
};

export type NarrationContext = {
  focusedEcId?: string | null;
  recentEcIds?: readonly string[];
  now?: Date;
};

export type NarrationResult = EventNarration[];
