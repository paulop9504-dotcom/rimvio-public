import type { EventCandidate } from "@/lib/events/event-candidate";
import { lifecycleRank, minutesUntilDatetime } from "@/lib/events/event-lifecycle";
import {
  LIFECYCLE_URGENCY,
  PRIORITY_THRESHOLDS,
  type EventOpportunityPriority,
  type EventOpportunitySignal,
  type OpportunityEngineContext,
  SCORABLE_LIFECYCLES,
} from "@/lib/opportunity-engine/types";

const EC_PREFIX = /^ec-/u;

export type OpportunityScoreBreakdown = {
  ecId: string;
  timeUrgency: number;
  lifecycleUrgency: number;
  contextRelevance: number;
  actionability: number;
  composite: number;
  reason: string;
  priority: EventOpportunityPriority;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isValidEcId(id: string): boolean {
  return EC_PREFIX.test(id.trim());
}

function priorityFromScore(score: number): EventOpportunityPriority {
  if (score >= PRIORITY_THRESHOLDS.high) {
    return "HIGH";
  }
  if (score >= PRIORITY_THRESHOLDS.medium) {
    return "MEDIUM";
  }
  return "LOW";
}

/** Branch A — time proximity (requires datetime on EventCandidate). */
function scoreTimeUrgency(event: EventCandidate, nowMs: number): number {
  if (!event.datetime?.trim()) {
    return 0;
  }
  const minutes = minutesUntilDatetime(event.datetime, nowMs);
  if (minutes == null) {
    return 0;
  }

  if (minutes < -120) {
    return 0;
  }
  if (minutes < 0) {
    return 0.2;
  }
  if (minutes <= 5) {
    return 1;
  }
  if (minutes <= 20) {
    return 0.9;
  }
  if (minutes <= 60) {
    return 0.75;
  }
  if (minutes <= 24 * 60) {
    return 0.5;
  }
  return 0.25;
}

/** Branch B — lifecycle urgency. */
function scoreLifecycleUrgency(event: EventCandidate): number {
  return LIFECYCLE_URGENCY[event.lifecycle] ?? 0;
}

/** Branch C — Dock / focus context (optional UI state only). */
function scoreContextRelevance(
  event: EventCandidate,
  context: OpportunityEngineContext
): number {
  let score = 0.35;

  const focused = context.focusedEcId?.trim();
  if (focused && focused === event.id) {
    score = 1;
  }

  const recent = context.recentEcIds ?? [];
  if (recent.includes(event.id)) {
    score = Math.max(score, 0.85);
  }

  return score;
}

/** Actionability — needs attention soon. */
function scoreActionability(
  event: EventCandidate,
  timeUrgency: number,
  lifecycleUrgency: number
): number {
  if (event.lifecycle === "completed") {
    return 0.1;
  }
  if (event.lifecycle === "active") {
    return clamp01(0.85 + timeUrgency * 0.15);
  }
  if (event.lifecycle === "scheduled") {
    return clamp01(lifecycleUrgency * 0.6 + timeUrgency * 0.4);
  }
  return clamp01(lifecycleUrgency * 0.5 + timeUrgency * 0.2);
}

function buildReason(input: {
  event: EventCandidate;
  timeUrgency: number;
  lifecycleUrgency: number;
  contextRelevance: number;
}): string {
  const parts: string[] = [];

  if (input.event.lifecycle === "active") {
    parts.push("active now");
  } else if (input.lifecycleUrgency >= 0.6) {
    parts.push(`${input.event.lifecycle}`);
  }

  if (input.timeUrgency >= 0.75) {
    parts.push("imminent");
  } else if (input.timeUrgency >= 0.5) {
    parts.push("approaching");
  }

  if (input.contextRelevance >= 0.85) {
    parts.push("in focus");
  }

  if (parts.length === 0) {
    return input.event.title;
  }

  return `${input.event.title}: ${parts.join(", ")}`;
}

/** Tree evaluation — convergence of time, lifecycle, and context branches. */
export function scoreEventOpportunity(
  event: EventCandidate,
  context: OpportunityEngineContext = {}
): OpportunityScoreBreakdown | null {
  if (!isValidEcId(event.id)) {
    return null;
  }
  if (!SCORABLE_LIFECYCLES.has(event.lifecycle)) {
    return null;
  }
  if (lifecycleRank(event.lifecycle) < 0) {
    return null;
  }

  const nowMs = context.now?.getTime() ?? Date.now();
  const timeUrgency = scoreTimeUrgency(event, nowMs);
  const lifecycleUrgency = scoreLifecycleUrgency(event);
  const contextRelevance = scoreContextRelevance(event, context);
  const actionability = scoreActionability(event, timeUrgency, lifecycleUrgency);

  const composite = clamp01(
    timeUrgency * 0.35 +
      lifecycleUrgency * 0.3 +
      contextRelevance * 0.15 +
      actionability * 0.2
  );

  if (composite <= 0) {
    return null;
  }

  return {
    ecId: event.id,
    timeUrgency,
    lifecycleUrgency,
    contextRelevance,
    actionability,
    composite,
    reason: buildReason({ event, timeUrgency, lifecycleUrgency, contextRelevance }),
    priority: priorityFromScore(composite),
  };
}

export function toOpportunitySignal(
  breakdown: OpportunityScoreBreakdown
): EventOpportunitySignal {
  return {
    ecId: breakdown.ecId,
    score: Math.round(breakdown.composite * 100) / 100,
    reason: breakdown.reason,
    priority: breakdown.priority,
  };
}

function rankKey(left: OpportunityScoreBreakdown, right: OpportunityScoreBreakdown): number {
  if (left.composite !== right.composite) {
    return right.composite - left.composite;
  }
  if (left.lifecycleUrgency !== right.lifecycleUrgency) {
    return right.lifecycleUrgency - left.lifecycleUrgency;
  }
  return left.ecId.localeCompare(right.ecId);
}

function passesSelfConsistency(
  passA: OpportunityScoreBreakdown[],
  passB: OpportunityScoreBreakdown[]
): boolean {
  if (passA.length !== passB.length) {
    return false;
  }

  for (let index = 0; index < passA.length; index += 1) {
    const a = passA[index]!;
    const b = passB[index]!;
    if (a.ecId !== b.ecId) {
      return false;
    }
    if (Math.abs(a.composite - b.composite) > 0.0001) {
      return false;
    }
    if (a.priority !== b.priority) {
      return false;
    }
  }

  return true;
}

/** Pure scoring pass — no store access, no mutation. */
export function evaluateEventOpportunities(
  events: readonly EventCandidate[],
  context: OpportunityEngineContext = {}
): OpportunityScoreBreakdown[] {
  const scored = events
    .map((event) => scoreEventOpportunity(event, context))
    .filter((item): item is OpportunityScoreBreakdown => item != null)
    .sort(rankKey);

  const max = context.maxResults ?? scored.length;
  return scored.slice(0, max);
}

/**
 * Rank opportunities with self-consistency check (two independent passes).
 * Returns empty list if passes diverge or input is invalid.
 */
export function rankEventOpportunities(
  events: readonly EventCandidate[],
  context: OpportunityEngineContext = {}
): EventOpportunitySignal[] {
  if (!Array.isArray(events)) {
    return [];
  }

  const passA = evaluateEventOpportunities(events, context);
  const passB = evaluateEventOpportunities(events, context);

  if (!passesSelfConsistency(passA, passB)) {
    return [];
  }

  return passA.map(toOpportunitySignal);
}
