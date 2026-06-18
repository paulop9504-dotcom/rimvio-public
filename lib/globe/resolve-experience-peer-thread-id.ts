import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveExperiencePeerThreadId(
  event: EventCandidate | null | undefined,
): string | null {
  if (!event) {
    return null;
  }
  const plan = readPlanContextFromEvent(event);
  const fromPlan = plan?.peerThreadId?.trim();
  if (fromPlan) {
    return fromPlan;
  }
  const raw = event.metadata?.planPeerThreadId;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return null;
}

export function buildExperienceRoomBackHref(eventId: string | null | undefined): string {
  const key = eventId?.trim();
  return key ? `/?recallEvent=${encodeURIComponent(key)}` : "/";
}
