#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  PIN_DOMAIN_SHIP_PHASE,
  resolveActivePinScope,
} from "../lib/globe/pin-domain-registry";
import { mergeGlobePinClusters, isExternalPinCluster } from "../lib/globe/merge-globe-pin-clusters";
import { projectPinClusterFromExternalTrace } from "../lib/globe/project-external-globe-trace";
import {
  filterExternalTracesNear,
  mapRemoteRowToExternalTrace,
} from "../lib/globe/server-external-globe-traces";
import { setGlobeContextVisibility } from "../lib/globe/set-globe-context-visibility";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { stampUniversalPinMetadata } from "../lib/globe/stamp-universal-pin-metadata";

assert.equal(PIN_DOMAIN_SHIP_PHASE, 3);
assert.equal(resolveActivePinScope("external"), "external");

const meta = stampUniversalPinMetadata({ scope: "external", domainId: "experience" });
assert.equal(meta.globeContextVisibility, "external");

resetEventCandidatesForTests();
resetPersonalGlobePinsForTests();

const manual = createManualGlobeContext({
  title: "공개 테스트",
  place: "서울",
  startIso: "2026-08-01T10:00",
  nights: 1,
  resolvedPlace: {
    label: "서울",
    placeName: "서울",
    lat: 37.5665,
    lng: 126.978,
    confirmed: true,
  },
});

const published = setGlobeContextVisibility({
  eventId: manual.event.id,
  external: true,
});
assert.equal(published.visibility, "external");
assert.ok(published.pioneerCell);

const external = projectPinClusterFromExternalTrace({
  traceId: "t1",
  eventId: "e-other",
  title: "도쿄 골목",
  placeLabel: "시부야",
  lat: 35.66,
  lng: 139.7,
  authorUserId: "user-other",
  authorDisplayName: "여행者",
  photoCount: 2,
  videoCount: 0,
  startedAtIso: "2026-01-01T00:00:00.000Z",
  recallLine: "밤에 걸어보세요",
  pioneerCell: "3566:13970",
});

assert.ok(isExternalPinCluster(external));

const merged = mergeGlobePinClusters({
  personal: [
    {
      pinId: manual.pin.pinId,
      eventId: manual.event.id,
      title: manual.event.title,
      placeLabel: "서울",
      lat: 37.5665,
      lng: 126.978,
      dateLabel: null,
      startedAtIso: manual.event.datetime ?? null,
      evidence: { photoCount: 0, videoCount: 0, chatCount: 0, placePinCount: 1 },
      recallLine: null,
    },
  ],
  externalTraces: [
    {
      traceId: "t1",
      eventId: "e-other",
      title: "도쿄 골목",
      placeLabel: "시부야",
      lat: 35.66,
      lng: 139.7,
      authorUserId: "user-other",
      authorDisplayName: null,
      photoCount: 2,
      videoCount: 0,
      startedAtIso: "2026-01-01T00:00:00.000Z",
      recallLine: "밤에 걸어보세요",
      pioneerCell: null,
    },
  ],
});

assert.equal(merged.length, 2);

const row = mapRemoteRowToExternalTrace({
  id: "row-1",
  user_id: "u2",
  event_id: "ev2",
  visibility: "external",
  lat: 37.5666,
  lng: 126.9781,
  updated_at: "2026-06-01T00:00:00.000Z",
  pin: {
    pinId: "pgpin:ev2",
    eventId: "ev2",
    lat: 37.5666,
    lng: 126.9781,
    placeLabel: "서울",
    experienceTitle: "한 줄 흔적",
    photoCount: 1,
    videoCount: 0,
    createdAtIso: "2026-06-01T00:00:00.000Z",
    acl: { viewerPeerThreadIds: [] },
  },
});

assert.ok(row);
const near = filterExternalTracesNear({
  rows: [
    {
      id: "row-1",
      user_id: "u2",
      event_id: "ev2",
      visibility: "external",
      lat: 37.5666,
      lng: 126.9781,
      updated_at: "2026-06-01T00:00:00.000Z",
      pin: row!.eventId ? {
        pinId: "pgpin:ev2",
        eventId: "ev2",
        lat: 37.5666,
        lng: 126.9781,
        placeLabel: "서울",
        experienceTitle: "한 줄 흔적",
        photoCount: 1,
        videoCount: 0,
        createdAtIso: "2026-06-01T00:00:00.000Z",
        acl: { viewerPeerThreadIds: [] },
      } : null,
    },
  ],
  lat: 37.5665,
  lng: 126.978,
  excludeUserId: "u1",
});

assert.equal(near.length, 1);

console.log("test-external-globe-traces: ok");
