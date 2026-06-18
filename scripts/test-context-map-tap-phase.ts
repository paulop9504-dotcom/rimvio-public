import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  contextMapTapPhaseAllowsMediaReplay,
  resolveInitialContextMapTapPhase,
  shouldShowContextHubOffer,
} from "../lib/globe/context-map-tap-phase";

function travelEvent(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: "evt:jeju",
    title: "제주 여행",
    place: "제주",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
    metadata: { feedPlanEnabled: true, globeManualContext: true },
    ...overrides,
  };
}

assert.equal(shouldShowContextHubOffer(travelEvent()), true);
assert.equal(
  resolveInitialContextMapTapPhase(travelEvent()),
  "hub_offer",
);
assert.equal(
  resolveInitialContextMapTapPhase(
    travelEvent({
      title: "강남 카페",
      category: "food",
      place: "강남",
      metadata: { globeManualContext: true },
    }),
  ),
  "awaiting_replay",
);
assert.equal(contextMapTapPhaseAllowsMediaReplay("media_open"), true);
assert.equal(contextMapTapPhaseAllowsMediaReplay("awaiting_replay"), false);

console.log("test-context-map-tap-phase: ok");
