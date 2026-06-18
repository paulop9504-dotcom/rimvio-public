import type { EventCandidate } from "@/lib/events/event-candidate";

export const GLOBE_CONTEXT_NOTE_KEY = "globeContextNote";

export function readPinContextNote(event: EventCandidate | null | undefined): string {
  const raw = event?.metadata?.[GLOBE_CONTEXT_NOTE_KEY];
  return typeof raw === "string" ? raw.trim() : "";
}
