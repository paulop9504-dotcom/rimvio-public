import type { CapabilityId } from "@/lib/capability-registry/capability-contract";

/** @deprecated V1 surface intents → canonical capability ids. */
export type LegacySurfaceActionIntent =
  | "book_flight"
  | "book_hotel"
  | "checkin_prep"
  | "confirm_schedule"
  | "set_reminder"
  | "confirm_place"
  | "navigate"
  | "call_contact"
  | "clarify_goal"
  | "review_plan"
  | "open_event"
  | "dismiss_surface";

const LEGACY_MAP: Record<LegacySurfaceActionIntent, CapabilityId> = {
  book_flight: "BOOK_FLIGHT",
  book_hotel: "BOOK_HOTEL",
  checkin_prep: "CHECK_IN",
  confirm_schedule: "CALENDAR",
  set_reminder: "ALARM",
  confirm_place: "CONFIRM_PLACE",
  navigate: "NAVIGATE",
  call_contact: "CALL",
  clarify_goal: "CLARIFY_GOAL",
  review_plan: "SEARCH",
  open_event: "OPEN_EVENT",
  dismiss_surface: "DISMISS_SURFACE",
};

export function mapLegacySurfaceIntent(intent: LegacySurfaceActionIntent): CapabilityId {
  return LEGACY_MAP[intent];
}
