export type CognitiveEventType =
  | "Event"
  | "Opportunity"
  | "Behavior"
  | "Notification"
  | "Container";

/** Raw stream item — read-only input for ContextBuilder v1. */
export type CognitiveEvent = {
  id: string;
  type: CognitiveEventType;
  timestamp: number;
  tags: readonly string[];
  embedding: readonly number[];
  engaged: boolean;
};

export type AttentionState = "FOCUSED" | "SCATTERED" | "IDLE";

/** Compressed cognitive state for visibility routing. */
export type CognitiveContext = {
  now: number;
  userIntentVector: number[];
  activeIntents: string[];
  attentionState: AttentionState;
  recentTopSignals: string[];
  suppressionMap: Record<string, number>;
};

export type ContextBuilderOptions = {
  now?: number;
  /** Recency half-life in ms — default 30 min. */
  recencyHalfLifeMs?: number;
  /** Recent activity window for attention — default 15 min. */
  attentionWindowMs?: number;
  maxActiveIntents?: number;
  maxTopSignals?: number;
};

export const URGENCY_TAGS = new Set([
  "urgent",
  "imminent",
  "deadline",
  "scheduled",
  "reminder",
  "active",
  "now",
]);

export const DISMISSAL_TAGS = new Set([
  "dismissed",
  "ignored",
  "suppressed",
  "dismiss",
  "mute",
]);
