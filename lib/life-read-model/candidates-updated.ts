/**
 * UI subscription helper — not a store read.
 * Hooks import from here; never from `event-store` directly.
 */
import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";

export { EVENT_CANDIDATES_UPDATED };

export function subscribeLifeCandidatesUpdated(onUpdate: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onUpdate();
  window.addEventListener(EVENT_CANDIDATES_UPDATED, handler);
  return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, handler);
}
