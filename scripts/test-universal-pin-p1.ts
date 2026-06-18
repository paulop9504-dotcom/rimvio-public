#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { runGlobeComposerAction } from "../lib/globe/run-globe-composer-action";
import {
  pinEntitiesToClusters,
  findPinEntityByEventId,
} from "../lib/globe/pin-cluster-adapter";
import {
  projectFilteredGlobePinEntities,
  projectGlobePinEntitiesFromGraph,
} from "../lib/globe/project-globe-pin-entities";
import { resolveInferredPinDomainStub } from "../lib/globe/resolve-inferred-pin-domain-stub";
import { ingestGlobeContextFromText } from "../lib/feed/ingest-globe-context-capture";
import { parseActionMention } from "../lib/event-kernel/action-contracts/parse-action-mention";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const navigate = runGlobeComposerAction("@길찾기 강남역");
  assert.ok(navigate);
  assert.equal(navigate!.kind, "url");
  assert.match(navigate!.url, /kakao|map|naver|http/iu);

  const marketMention = parseActionMention("@중고 아이폰");
  assert.ok(marketMention);
  assert.equal(marketMention!.feature.featureId, "market");

  const marketStub = runGlobeComposerAction("@중고 아이폰 70만원");
  assert.ok(marketStub);
  assert.equal(marketStub!.kind, "stub");
  assert.equal(marketStub!.featureId, "market");

  const manual = createManualGlobeContext({
    title: "제주",
    place: "제주",
    startIso: "2026-08-01T10:00",
    nights: 1,
    resolvedPlace: {
      label: "제주",
      placeName: "제주",
      lat: 33.4996,
      lng: 126.5312,
      confirmed: true,
    },
  });

  const events = [manual.event];
  const eventsById = indexEventsById(events);
  const entities = projectGlobePinEntitiesFromGraph({
    volumes: [],
    eventsById,
  });
  assert.ok(findPinEntityByEventId(entities, manual.event.id));

  const filtered = projectFilteredGlobePinEntities({
    volumes: [],
    eventsById,
    timeFilter: "all",
    peopleFilter: null,
  });
  const clusters = pinEntitiesToClusters(filtered);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.eventId, manual.event.id);

  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const ingested = ingestGlobeContextFromText("맥북 팝니다 90만원");
  const stub = resolveInferredPinDomainStub(ingested.result.event.id);
  assert.ok(stub);
  assert.equal(stub!.inferredDomainId, "market");

  console.log("test-universal-pin-p1: ok");
}

main();
