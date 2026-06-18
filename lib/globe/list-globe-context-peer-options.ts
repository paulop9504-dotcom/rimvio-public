import type { EventCandidate } from "@/lib/events/event-candidate";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import { personLabelsMatch } from "@/lib/people-graph/match-person-label";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type GlobeContextPeerOption = {
  displayName: string;
  contextCount: number;
};

function isGlobeContextEvent(event: EventCandidate): boolean {
  if (isGlobeContextRemoved(event) || event.lifecycle === "archived") {
    return false;
  }
  if (findPersonalGlobePinByEventId(event.id)) {
    return true;
  }
  const meta = event.metadata ?? {};
  if (meta.globeManualContext === true || meta.targetingSource === "globe_manual") {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  return Boolean(plan?.place?.trim() && meta.feedPlanEnabled === true);
}

/** Distinct peers on personal globe contexts — People rail SSOT. */
export function listGlobeContextPeerOptions(
  events: readonly EventCandidate[],
): GlobeContextPeerOption[] {
  const buckets = new Map<string, { displayName: string; count: number }>();

  for (const event of events) {
    if (!isGlobeContextEvent(event)) {
      continue;
    }
    for (const name of collectEventPeople(event)) {
      const displayName = name.trim();
      if (!displayName || displayName === "나") {
        continue;
      }
      const existing = [...buckets.values()].find((row) =>
        personLabelsMatch(row.displayName, displayName),
      );
      if (existing) {
        existing.count += 1;
        continue;
      }
      buckets.set(displayName.toLowerCase(), { displayName, count: 1 });
    }
  }

  return [...buckets.values()]
    .map((row) => ({ displayName: row.displayName, contextCount: row.count }))
    .sort(
    (left, right) =>
      right.contextCount - left.contextCount ||
      left.displayName.localeCompare(right.displayName, "ko"),
  );
}
