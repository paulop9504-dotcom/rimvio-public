import type { EventCandidate } from "@/lib/events/event-candidate";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readContextTicketArtifact } from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { listContextHubLinks } from "@/lib/globe/context-hub/list-context-hub-links";
import { listPlaceSuccessPatterns } from "@/lib/globe/place-history/infer-place-success-patterns";
import type {
  PlacePrefillHubId,
  PlacePrefillPlan,
} from "@/lib/globe/place-history/place-prefill-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function resolvePlaceLabel(event: EventCandidate): string | null {
  const plan = readPlanContextFromEvent(event);
  return plan?.place?.trim() || event.place?.trim() || null;
}

function isHubConnected(event: EventCandidate, hubId: PlacePrefillHubId): boolean {
  switch (hubId) {
    case "lodging":
      return isLodgingHubEnabled(event);
    case "ticket":
      return Boolean(readContextTicketArtifact(event)?.actionUrl);
    case "flight":
      return listContextHubLinks(event).some((row) => row.kind === "departure_airport");
    default:
      return false;
  }
}

/** Deterministic pre-fill plan from place rollup — no LLM. */
export function buildPlacePrefillPlan(event: EventCandidate): PlacePrefillPlan | null {
  const placeLabel = resolvePlaceLabel(event);
  if (!placeLabel) {
    return null;
  }

  const placeKey = placeLabel.toLowerCase().replace(/\s+/g, "_");
  const patterns = listPlaceSuccessPatterns(placeLabel).filter(
    (row) => !isHubConnected(event, row.hubId),
  );
  if (patterns.length === 0) {
    return null;
  }

  const hubNames = patterns.map((row) => row.labelKo).join(" · ");
  return {
    placeKey,
    placeLabel,
    headlineKo: `${placeLabel} · 지난번 패턴`,
    lineKo: `지난번처럼 ${hubNames}부터 담아드릴까요?`,
    hubs: patterns,
  };
}
