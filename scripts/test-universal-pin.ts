#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { classifyPinDomainFromText } from "../lib/globe/classify-pin-domain";
import { previewPinFromComposerText } from "../lib/globe/commit-pin-from-composer";
import { ingestGlobeContextFromText } from "../lib/feed/ingest-globe-context-capture";
import {
  projectPinEntityFromEvent,
  pinEntityToCluster,
} from "../lib/globe/project-pin-entity";
import { getPinDomain, listPinDomains } from "../lib/globe/pin-domain-registry";
import {
  readPinDomainId,
  readPinInferredDomainId,
  readPinSlots,
} from "../lib/globe/stamp-universal-pin-metadata";
import { PIN_DOMAIN_META_KEY } from "../lib/globe/pin-entity";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  assert.ok(listPinDomains().length >= 6);
  assert.equal(getPinDomain("experience").activatesAtPhase, 1);
  assert.equal(getPinDomain("gathering").activatesAtPhase, 3);
  assert.equal(getPinDomain("market").activatesAtPhase, 4);
  assert.equal(getPinDomain("job").activatesAtPhase, 5);

  const market = classifyPinDomainFromText("아이폰 17 팔아요. 70만원");
  assert.equal(market.domainId, "experience");
  assert.equal(market.inferredDomainId, "market");
  assert.equal(market.slots.priceKrw, 700_000);

  const preview = previewPinFromComposerText("원룸 월세 50만 보증금 500");
  assert.equal(preview.inferredDomainId, "property");
  assert.equal(preview.domainId, "experience");

  const manual = createManualGlobeContext({
    title: "제주 Day1",
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

  assert.equal(readPinDomainId(manual.event.metadata), "experience");
  assert.equal(manual.event.metadata?.globeContextVisibility, "private");

  const entity = projectPinEntityFromEvent(manual.event, manual.pin);
  assert.equal(entity.eventId, manual.event.id);
  assert.equal(entity.domainId, "experience");
  assert.equal(entity.scope, "internal");
  assert.ok(entity.location.lat > 33);

  const roundTrip = pinEntityToCluster(entity);
  assert.equal(roundTrip.eventId, entity.eventId);
  assert.equal(roundTrip.pinId, entity.id);

  const ingested = ingestGlobeContextFromText("새벽에 가기 좋은 라멘 · 신주쿠");
  assert.equal(readPinDomainId(ingested.result.event.metadata), "experience");
  assert.ok(ingested.result.event.metadata?.[PIN_DOMAIN_META_KEY]);

  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const marketIngest = ingestGlobeContextFromText("맥북 팝니다 120만원");
  assert.equal(readPinDomainId(marketIngest.result.event.metadata), "experience");
  assert.equal(
    readPinInferredDomainId(marketIngest.result.event.metadata),
    "market",
  );
  const slots = readPinSlots(marketIngest.result.event.metadata);
  assert.equal(slots.priceKrw, 1_200_000);

  console.log("test-universal-pin: ok");
}

main();
