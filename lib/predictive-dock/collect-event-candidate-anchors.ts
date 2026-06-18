import type { EventCandidateLifecycle } from "@/lib/events/event-candidate";
import { readLifeProjections } from "@/lib/life-read-model";
import type { ScheduleAnchor } from "@/lib/predictive-dock/types";

/** Dock-visible lifecycles — excludes archived and unused candidate. */
const DOCK_VISIBLE_LIFECYCLES = new Set<EventCandidateLifecycle>([
  "mentioned",
  "confirmed",
  "scheduled",
  "active",
  "completed",
]);

/** EventCandidate store → dock timeline anchors (SSOT read path). */
export function collectEventCandidateAnchors(): ScheduleAnchor[] {
  return readLifeProjections().events
    .filter((event) => DOCK_VISIBLE_LIFECYCLES.has(event.lifecycle))
    .filter((event) => Boolean(event.datetime?.trim()))
    .map((event) => ({
      id: event.id,
      fireAt: event.datetime!,
      placeName: event.place?.trim() || event.title,
      task: event.title,
      phone:
        typeof event.metadata?.phone === "string" ? event.metadata.phone : null,
    }))
    .sort((left, right) => left.fireAt.localeCompare(right.fireAt));
}

export function nearestEventCandidateAnchorMinutes(nowMs: number): number | null {
  const nearest = collectEventCandidateAnchors()[0];
  if (!nearest) {
    return null;
  }
  const target = new Date(nearest.fireAt).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  return Math.round((target - nowMs) / 60_000);
}
