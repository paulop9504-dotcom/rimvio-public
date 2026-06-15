import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildPinClusterFromEvent } from "../lib/globe/build-pin-cluster-from-event";
import { listGlobeContextTimeline } from "../lib/globe/list-globe-context-timeline";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { projectExperienceHeroFromEvent } from "../lib/globe/project-experience-hero";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const pastCtx = createManualGlobeContext({
    title: "작년 제주",
    place: "제주",
    startIso: "2025-01-10T10:00",
    nights: 2,
  });
  const futureCtx = createManualGlobeContext({
    title: "내년 오사카",
    place: "오사카",
    startIso: "2027-03-15T10:00",
    nights: 3,
  });

  const now = new Date("2026-06-10T12:00:00+09:00");
  const timeline = listGlobeContextTimeline(
    [
      {
        id: "orphan",
        title: "무관",
        category: "other",
        source: "message",
        lifecycle: "active",
        confidence: 0.5,
        metadata: {},
        lifecycleUpdatedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } satisfies EventCandidate,
    ],
    now,
  );

  assert.equal(timeline.total, 0);

  const full = listGlobeContextTimeline(
    [pastCtx.event, futureCtx.event],
    now,
  );
  assert.equal(full.total, 2);
  assert.equal(full.past.length, 1);
  assert.equal(full.future.length, 1);
  assert.equal(full.past[0]?.title, "작년 제주");
  assert.equal(full.future[0]?.title, "내년 오사카");

  const pastCluster = buildPinClusterFromEvent(pastCtx.event, pastCtx.pin);
  assert.equal(pastCluster.eventId, pastCtx.event.id);
  assert.ok(pastCluster.dateLabel?.includes("2025"));
  const hero = projectExperienceHeroFromEvent({
    event: pastCtx.event,
    allEvents: [pastCtx.event],
  });
  assert.ok(hero?.title);

  console.log("test-globe-context-timeline: ok");
}

main();
