/** Recall Engine V2 — time × people × place triggered nostalgia (no LLM). */

export const RECALL_TRIGGERS = [
  "same_person",
  "same_place",
  "same_date",
  "same_city",
  "same_calendar_event",
] as const;

export type RecallTrigger = (typeof RECALL_TRIGGERS)[number];

export type RecallMediaKind = "photo" | "video" | "globe_pin" | "none";

export type RecallMedia = {
  kind: RecallMediaKind;
  captureId?: string;
  url?: string;
  placeLabel?: string;
  capturedAtIso?: string;
};

export type RecallCandidate = {
  id: string;
  /** Past experience to replay. */
  eventId: string;
  triggers: readonly RecallTrigger[];
  headline: string;
  media: RecallMedia;
  reason: string;
  /** 0–100 composite confidence. */
  confidence: number;
  feedHref: string;
};

export type RecallAnchor = {
  /** Current context — excluded from matches. */
  eventId?: string | null;
  title?: string | null;
  place?: string | null;
  peerDisplayName?: string | null;
  datetimeIso?: string | null;
  /** Google Calendar recurring id when available. */
  gcalEventId?: string | null;
};

/** Minimum confidence to surface. */
export const RECALL_MIN_CONFIDENCE = 45;

/** Max recalls surfaced per calendar day — daily nostalgia spam 금지. */
export const RECALL_MAX_PER_DAY = 1;

/** Cooldown between any recall surfaces. */
export const RECALL_COOLDOWN_MS = 12 * 60 * 60 * 1000;
