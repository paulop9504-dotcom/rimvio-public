import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildLifeContextSnapshot,
  detectEventHorizon,
} from "@/lib/event-horizon/build-life-context-snapshot";
import { listRankedEventOpportunities } from "@/lib/opportunity-engine/rank-event-opportunities";
import type { LifeProjections } from "@/lib/life-read-model/types";
import type { PersonalReadRecallSlice, RecallTriggerKind } from "@/lib/personal-read-model/types";

const TRAVEL_D_MINUS_PATTERN =
  /d-?[01]\b|오늘\s*출발|내일\s*출발|today|tomorrow|urgent/iu;

function isTravelDMinus(event: EventCandidate): boolean {
  if (event.category !== "travel") {
    return false;
  }
  const hay = `${event.title} ${event.place ?? ""}`;
  return TRAVEL_D_MINUS_PATTERN.test(hay);
}

function opportunityUrgency(score: number, priority: string): number {
  const base = Math.round(score * 100);
  if (priority === "HIGH") {
    return Math.min(100, base + 15);
  }
  if (priority === "MEDIUM") {
    return Math.min(100, base + 5);
  }
  return base;
}

export function mapRecallSlice(input: {
  life: LifeProjections;
  focusEvent: EventCandidate | null;
  now: Date;
}): PersonalReadRecallSlice {
  const { life, focusEvent, now } = input;
  const eligibleTriggers: PersonalReadRecallSlice["eligibleTriggers"] = [];

  const opportunities = listRankedEventOpportunities(
    { now, focusedEcId: focusEvent?.id ?? null, maxResults: 5 },
    life.events,
  );

  for (const row of opportunities) {
    eligibleTriggers.push({
      kind: "opportunity_rank",
      eventId: row.ecId,
      urgency: opportunityUrgency(row.score, row.priority),
      reasonCode: row.reason,
    });
  }

  if (focusEvent && isTravelDMinus(focusEvent)) {
    eligibleTriggers.push({
      kind: "travel_d_minus",
      eventId: focusEvent.id,
      urgency: 90,
      reasonCode: "travel_departure_imminent",
    });
  }

  const schedule = life.existingSchedule;
  const snapshot = buildLifeContextSnapshot({
    referenceDate: life.dateKey,
    existingSchedule: schedule,
    now,
  });
  const horizonInsights = detectEventHorizon(snapshot, []).map((row) => ({
    kind: row.kind,
    headline: row.headline,
    severity: row.severity,
  }));

  for (const insight of horizonInsights) {
    if (insight.severity !== "high") {
      continue;
    }
    eligibleTriggers.push({
      kind: "calendar_horizon",
      eventId: focusEvent?.id ?? life.events[0]?.id ?? "schedule",
      urgency: insight.severity === "high" ? 75 : 50,
      reasonCode: insight.kind,
    });
  }

  const deduped = eligibleTriggers.filter(
    (row, index, list) =>
      list.findIndex(
        (other) => other.kind === row.kind && other.eventId === row.eventId,
      ) === index,
  );

  deduped.sort((a, b) => b.urgency - a.urgency);

  return {
    eligibleTriggers: deduped.slice(0, 8),
    horizonInsights,
  };
}

export type { RecallTriggerKind };
