#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ExperienceVolume } from "../lib/experience-graph/experience-volume-types";
import { isGlobeRecallEligible } from "../lib/feed/resolve-globe-recall-eligibility";

function volume(
  eventType: ExperienceVolume["eventType"],
  spaceLabel: string,
): ExperienceVolume {
  return {
    id: "v1",
    title: "테스트",
    sourceEventId: "e1",
    activeLayer: "experience",
    time: { startIso: "2026-06-01T10:00:00+09:00" },
    space: { label: spaceLabel, clusterId: "c1" },
    peaks: [],
    eventType,
    activeLens: "where",
  };
}

assert.equal(
  isGlobeRecallEligible({ volume: volume("travel", "제주 애월") }),
  true,
);
assert.equal(
  isGlobeRecallEligible({ volume: volume("schedule", "") }),
  false,
);
assert.equal(
  isGlobeRecallEligible({
    volume: volume("schedule", "강남역"),
    placeHint: "강남역",
  }),
  true,
);
assert.equal(
  isGlobeRecallEligible({ volume: volume("daily", "") }),
  false,
);

console.log("test-globe-recall-eligibility: ok");
