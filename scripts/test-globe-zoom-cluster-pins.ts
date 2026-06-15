import assert from "node:assert/strict";
import type { ClassifiedGlobePin } from "../lib/feed/experience-globe-ping-types";
import { projectGlobeZoomClusterPins } from "../lib/globe/project-globe-zoom-cluster-pins";

function pin(
  id: string,
  lat: number,
  lng: number,
): ClassifiedGlobePin {
  return {
    id,
    kind: "place",
    label: id,
    lat,
    lng,
    pinX: 50,
    pinY: 50,
    sourceEventId: id,
    emphasis: "primary",
    pinShape: "default",
  };
}

function testSpaceHidesScatteredSingletons() {
  const pins = [
    pin("seoul", 37.5665, 126.978),
    pin("jeju", 33.4996, 126.5312),
    pin("shanghai", 31.2304, 121.4737),
  ];
  const out = projectGlobeZoomClusterPins(pins, "space");
  assert.equal(out.length, 0);
}

function testSpaceKeepsNearbyCluster() {
  const pins = [
    pin("a", 37.5665, 126.978),
    pin("b", 37.57, 126.99),
  ];
  const out = projectGlobeZoomClusterPins(pins, "space");
  assert.equal(out.length, 1);
  assert.equal(out[0]?.pinShape, "cluster");
}

function testCityShowsSingletons() {
  const pins = [pin("solo", 37.5665, 126.978)];
  const out = projectGlobeZoomClusterPins(pins, "city");
  assert.equal(out.length, 1);
  assert.equal(out[0]?.pinShape, "default");
}

function testSpaceHidesLoneContextWithViewer() {
  const viewer: ClassifiedGlobePin = {
    id: "viewer:here",
    kind: "gps",
    label: "현재 위치",
    lat: 37.5,
    lng: 127,
    pinX: 50,
    pinY: 50,
    pinShape: "viewer",
    emphasis: "primary",
  };
  const out = projectGlobeZoomClusterPins(
    [viewer, pin("far", 33.4, 126.5)],
    "space",
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]?.pinShape, "viewer");
}

testSpaceHidesScatteredSingletons();
testSpaceKeepsNearbyCluster();
testCityShowsSingletons();
testSpaceHidesLoneContextWithViewer();
console.log("test-globe-zoom-cluster-pins: ok");
