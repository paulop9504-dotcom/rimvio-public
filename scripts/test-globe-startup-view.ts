#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveGlobeStartupView } from "../lib/globe/resolve-globe-startup-view";
import type { PinCluster } from "../lib/globe/pin-cluster-types";
import { globeViewForPinClusters } from "../lib/globe/project-pin-clusters";

function cluster(
  id: string,
  lat: number,
  lng: number,
  placeLabel: string,
): PinCluster {
  return {
    pinId: `pcluster:${id}`,
    eventId: id,
    title: placeLabel,
    placeLabel,
    lat,
    lng,
    dateLabel: null,
    startedAtIso: null,
    evidence: { photoCount: 1, videoCount: 0, chatCount: 0, placePinCount: 1 },
    recallLine: null,
  };
}

const daejeonA = cluster("a", 36.35, 127.38, "대전 둔산");
const daejeonB = cluster("b", 36.34, 127.39, "대전 라도무스");
const jeju = cluster("c", 33.389, 126.553, "제주");

const dense = resolveGlobeStartupView([daejeonA, daejeonB, jeju]);
assert.ok(dense, "startup view should exist");
assert.equal(dense!.pinCount, 2);
assert.ok(Math.abs(dense!.lat - 36.345) < 0.05);
assert.ok(Math.abs(dense!.lng - 127.385) < 0.05);
assert.equal(dense!.level, "neighborhood");

const single = resolveGlobeStartupView([jeju]);
assert.equal(single!.level, "neighborhood");
assert.ok(Math.abs(single!.lat - 33.389) < 0.01);

const homeView = globeViewForPinClusters([daejeonA, daejeonB, jeju]);
assert.ok(Math.abs(homeView.lat - dense!.lat) < 0.05);
assert.ok(homeView.zoom > 1.2);

console.log("test-globe-startup-view: ok");
