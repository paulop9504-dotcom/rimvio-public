import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { getCapabilityLearningBoost } from "@/lib/learning/surface-weight-adapter";
import { getSynapticPriorityBoost } from "@/lib/synaptic/synapse-surface-adapter";
import type { SurfaceBuildContext, SurfacePriorityBand } from "@/lib/surface-engine/surface-contract";

const MS_PER_HOUR = 60 * 60 * 1000;

export function parseEventStartMs(event: EventCandidate): number | null {
  const iso = event.datetime?.trim();
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Hours until start; negative = already started. */
export function hoursUntilEvent(event: EventCandidate, now: Date): number | null {
  const startMs = parseEventStartMs(event);
  if (startMs === null) {
    return null;
  }
  return (startMs - now.getTime()) / MS_PER_HOUR;
}

export function lifecycleUrgencyWeight(lifecycle: EventCandidate["lifecycle"]): number {
  switch (lifecycle) {
    case "scheduled":
      return 40;
    case "active":
      return 35;
    case "confirmed":
      return 28;
    case "mentioned":
      return 12;
    case "completed":
      return 4;
    case "archived":
      return 0;
    default:
      return 8;
  }
}

export function proximityUrgencyScore(hoursUntil: number | null, now: Date): number {
  if (hoursUntil === null) {
    return 6;
  }
  if (hoursUntil < 0) {
    return 18;
  }
  if (hoursUntil <= 0.5) {
    return 50;
  }
  if (hoursUntil <= 2) {
    return 42;
  }
  if (hoursUntil <= 24) {
    return 32;
  }
  if (hoursUntil <= 72) {
    return 22;
  }
  const dayKey = now.toISOString().slice(0, 10);
  if (hoursUntil <= 168) {
    return 14;
  }
  void dayKey;
  return 8;
}

export function recencyScore(updatedAt: string, now: Date): number {
  const updatedMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedMs)) {
    return 0;
  }
  const ageHours = (now.getTime() - updatedMs) / MS_PER_HOUR;
  if (ageHours <= 1) {
    return 20;
  }
  if (ageHours <= 6) {
    return 14;
  }
  if (ageHours <= 24) {
    return 8;
  }
  if (ageHours <= 72) {
    return 4;
  }
  return 1;
}

export function interactionScore(
  surfaceId: string,
  eventId: string,
  context: SurfaceBuildContext,
  primaryCapabilityId?: CapabilityId,
): number {
  if (context.dismissedSurfaceIds?.includes(surfaceId)) {
    return -200;
  }

  let score = 0;
  if (context.focusedSurfaceId === surfaceId) {
    score += 24;
  }
  if (context.recentEventIds?.includes(eventId)) {
    score += 10;
  }

  if (primaryCapabilityId) {
    const primaryKey = `${surfaceId}:${primaryCapabilityId}`;
    if (context.completedActionIds?.includes(primaryKey)) {
      score -= 72;
    }
  }

  if (context.completedActionIds?.length) {
    const prefix = `${surfaceId}:`;
    const completedOnSurface = context.completedActionIds.filter((id) =>
      id.startsWith(prefix),
    ).length;
    if (completedOnSurface > 0) {
      score -= Math.min(24, completedOnSurface * 8);
    }
  }

  return score;
}

export function bandFromScore(score: number): SurfacePriorityBand {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 60) {
    return "high";
  }
  if (score >= 35) {
    return "medium";
  }
  return "low";
}

export function computeRawPriorityScore(input: {
  event: EventCandidate;
  surfaceId: string;
  context: SurfaceBuildContext;
  now: Date;
  /** Primary action capability — learning boost applied when set. */
  primaryCapabilityId?: CapabilityId;
}): { score: number; band: SurfacePriorityBand; urgencyHours?: number } {
  const hours = hoursUntilEvent(input.event, input.now);
  const learningBoost = input.primaryCapabilityId
    ? getCapabilityLearningBoost(input.primaryCapabilityId, {
        now: input.now,
        channel: input.context.activeChannel,
      })
    : 0;
  const synapticBoost =
    input.primaryCapabilityId != null
      ? getSynapticPriorityBoost(input.surfaceId, input.primaryCapabilityId)
      : 0;
  const score =
    proximityUrgencyScore(hours, input.now) +
    lifecycleUrgencyWeight(input.event.lifecycle) +
    recencyScore(input.event.updatedAt, input.now) +
    interactionScore(
      input.surfaceId,
      input.event.id,
      input.context,
      input.primaryCapabilityId,
    ) +
    Math.round(input.event.confidence * 8) +
    learningBoost +
    synapticBoost;

  return {
    score: Math.max(0, Math.round(score)),
    band: bandFromScore(score),
    urgencyHours: hours ?? undefined,
  };
}
