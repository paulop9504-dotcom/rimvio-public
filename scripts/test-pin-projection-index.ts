#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { buildPersonalPinProjectionIndex } from "../lib/globe/build-personal-pin-projection-index";
import {
  pinProjectionRecordInBbox,
  queryPinProjectionIndex,
} from "../lib/globe/query-pin-projection-index";
import { projectionRecordToPinEntity } from "../lib/globe/pin-projection-index-record";
import { projectFilteredGlobePinEntities } from "../lib/globe/project-globe-pin-entities";
import { upsertPersonalGlobePin } from "../lib/globe/personal-globe-pin-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";

resetEventCandidatesForTests();
resetPersonalGlobePinsForTests();

const seoul = commitEventUpsert({
  id: "ec-index-seoul",
  title: "Seoul day",
  category: "experience",
  source: "manual",
  lifecycle: "active",
  place: "Seoul",
  metadata: {
    globePlaceConfirmed: true,
    globePlaceLat: 37.5665,
    globePlaceLng: 126.978,
    globePlaceLabel: "Seoul",
  },
});

const jeju = commitEventUpsert({
  id: "ec-index-jeju",
  title: "Jeju trip",
  category: "experience",
  source: "manual",
  lifecycle: "active",
  place: "Jeju",
  metadata: {
    globePlaceConfirmed: true,
    globePlaceLat: 33.4996,
    globePlaceLng: 126.5312,
    globePlaceLabel: "Jeju",
  },
});

const seoulCoords = resolveEventGlobeCoords(seoul);
const jejuCoords = resolveEventGlobeCoords(jeju);

upsertPersonalGlobePin({
  pinId: "pin:seoul",
  eventId: seoul.id,
  lat: seoulCoords.lat,
  lng: seoulCoords.lng,
  placeLabel: seoulCoords.placeLabel,
  experienceTitle: seoul.title,
  photoCount: 1,
  videoCount: 0,
  createdAtIso: "2026-06-01T10:00:00.000Z",
  acl: { viewerPeerThreadIds: [] },
});

upsertPersonalGlobePin({
  pinId: "pin:jeju",
  eventId: jeju.id,
  lat: jejuCoords.lat,
  lng: jejuCoords.lng,
  placeLabel: jejuCoords.placeLabel,
  experienceTitle: jeju.title,
  photoCount: 2,
  videoCount: 0,
  createdAtIso: "2026-06-02T10:00:00.000Z",
  acl: { viewerPeerThreadIds: [] },
});

const events = [seoul, jeju];
const eventsById = indexEventsById(events);
const volumes = events.map((event) => ({
  sourceEventId: event.id,
  title: event.title,
  space: { label: event.place ?? "place", lat: null, lng: null },
  time: { startIso: event.datetime ?? null, endIso: null },
}));

const index = buildPersonalPinProjectionIndex({ volumes, eventsById });
assert.equal(index.length, 2);

const seoulBbox = {
  minLat: 37.0,
  maxLat: 38.0,
  minLng: 126.0,
  maxLng: 127.5,
};
const seoulSlice = queryPinProjectionIndex({
  records: index,
  bbox: seoulBbox,
});
assert.equal(seoulSlice.records.length, 1);
assert.equal(seoulSlice.records[0]!.eventId, seoul.id);
assert.ok(pinProjectionRecordInBbox(seoulSlice.records[0]!, seoulBbox));

const entities = projectFilteredGlobePinEntities({
  volumes,
  eventsById,
  timeFilter: "all",
});
assert.equal(entities.length, 2);
assert.equal(projectionRecordToPinEntity(seoulSlice.records[0]!, seoul).eventId, seoul.id);

console.log("test-pin-projection-index: ok");
