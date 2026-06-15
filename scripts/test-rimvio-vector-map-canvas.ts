#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isRimvioVectorRoadLayerId,
  resolveRimvioVectorRoadLineColor,
  RIMVIO_VECTOR_MAP_CANVAS,
} from "../lib/globe/rimvio-vector-map-canvas-theme";

assert.ok(isRimvioVectorRoadLayerId("road_minor"));
assert.ok(isRimvioVectorRoadLayerId("tunnel_motorway"));
assert.ok(isRimvioVectorRoadLayerId("bridge_street"));
assert.ok(!isRimvioVectorRoadLayerId("water"));
assert.ok(!isRimvioVectorRoadLayerId("park"));

assert.equal(
  resolveRimvioVectorRoadLineColor("road_motorway_casing"),
  RIMVIO_VECTOR_MAP_CANVAS.roadCasing,
);
assert.equal(
  resolveRimvioVectorRoadLineColor("road_motorway"),
  RIMVIO_VECTOR_MAP_CANVAS.roadMajor,
);
assert.equal(
  resolveRimvioVectorRoadLineColor("road_minor"),
  RIMVIO_VECTOR_MAP_CANVAS.roadMinor,
);

assert.match(RIMVIO_VECTOR_MAP_CANVAS.waterFill, /^#[0-9a-f]{6}$/i);
assert.match(RIMVIO_VECTOR_MAP_CANVAS.parkFill, /^#[0-9a-f]{6}$/i);
assert.match(RIMVIO_VECTOR_MAP_CANVAS.buildingFill, /^#[0-9a-f]{6}$/i);

console.log("test-rimvio-vector-map-canvas: ok");
