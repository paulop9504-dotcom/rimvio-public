/**
 * Blink Layer Stack — Jobs-style product architecture.
 * Upper layers depend on lower; UI never skips normalization.
 */

export const BLINK_LAYERS = {
  /** L5 — 개인 Intent (future AI): Stack top 1 선정, 버튼 순서·리마인드 시각 */
  intelligence: 5,
  /** L4 — Data: links, facts[], actions[], preferences */
  data: 4,
  /** L3 — Enrichment: Generic → Domain → Intent */
  enrichment: 3,
  /** L2 — Interaction: Share bridge, Now sheet, swipe Done */
  interaction: 2,
  /** L1 — Surface: Stack (home), Now (share landing), Inbox (deep) */
  surface: 1,
  /** L0 — Philosophy: one thing at a time, 1–2 tap, zero inbox guilt */
  experience: 0,
} as const;

export type BlinkSurface = "stack" | "now" | "inbox" | "archive";

export const SURFACE_ROUTES: Record<BlinkSurface, string> = {
  stack: "/",
  now: "/now",
  inbox: "/inbox",
  archive: "/archive",
};
