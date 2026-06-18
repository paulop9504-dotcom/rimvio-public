/** Fragments that compose an Experience Node with its EventCandidate + plan. */
export type FeedCaptureKind = "photo" | "video" | "link" | "memo" | "gps_dwell";

export type FeedCaptureFragment = {
  id: string;
  kind: FeedCaptureKind;
  capturedAtIso: string;
  mediaContextId?: string;
  placeLabel?: string;
  label?: string;
  url?: string;
  dwellMinutes?: number;
  /** Search ingress auto-attach — awaits one-tap verify on Feed. */
  autoAttached?: boolean;
  verified?: boolean;
  /** Bridge / shared capture — who uploaded. */
  ownerUserId?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
};

export type FeedCaptureStats = {
  photos: number;
  videos: number;
  links: number;
  memos: number;
};

export const FEED_CAPTURES_META_KEY = "feedCaptures";
export const FEED_CAPTURE_STATS_META_KEY = "feedCaptureStats";
export const FEED_CAPTURE_PENDING_VERIFY_META_KEY = "feedCapturePendingVerify";
export const FEED_CAPTURE_VERIFIED_AT_META_KEY = "feedCaptureVerifiedAt";

export type SpacetimeFeedTargetConfidence = "high" | "medium" | "low";

export type SpacetimeFeedTargetMatch = {
  eventId: string;
  eventTitle: string;
  confidence: SpacetimeFeedTargetConfidence;
  score: number;
  placeLabel: string | null;
  dayLabel: string | null;
  reason: string;
};
