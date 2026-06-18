/** AI Lens — suggest-only deep link bubbles (no auto execution). */

export type LensIntentKind =
  | "meeting"
  | "time"
  | "place"
  | "place_pending"
  | "transfer"
  | "link"
  | "movie";

export type LensActionType =
  | "schedule"
  | "navigate"
  | "movie_schedule"
  | "transfer"
  | "save_resource"
  | "open_link";

export type DeepLinkBubbleCandidate = {
  id: string;
  actionType: LensActionType;
  label: string;
  score: number;
  confidence: number;
  reason: string;
  deepLink: string;
  /** Optional payload for execute (ISO datetime, place query, url). */
  payload?: {
    title?: string;
    datetime?: string;
    place?: string;
    url?: string;
    category?: "schedule" | "travel" | "food" | "entertainment";
  };
};

export type LensThreadContext = {
  intents: Set<LensIntentKind>;
  dateKey: string | null;
  dateLabel: string | null;
  timeText: string | null;
  placeText: string | null;
  titleHint: string | null;
  urls: string[];
  transferHint: boolean;
  movieHint: boolean;
  lastPeerBody: string | null;
  anchorMessageId: string | null;
};

export type PeerAiLensAnalysis = {
  anchorMessageId: string | null;
  candidates: DeepLinkBubbleCandidate[];
  /** Actionable human messages → their own lens bubbles (no cross-message bleed). */
  candidatesByMessageId: Readonly<Record<string, DeepLinkBubbleCandidate[]>>;
  context: LensThreadContext;
};
