import assert from "node:assert/strict";
import { spreadOverlappingPinCoords } from "../lib/globe/spread-overlapping-pin-coords";

function testSunflowerSpread() {
  const pins = [
    { id: "a", lat: 37.5665, lng: 126.978 },
    { id: "b", lat: 37.56652, lng: 126.97802 },
    { id: "c", lat: 37.56648, lng: 126.97798 },
  ];
  const spread = spreadOverlappingPinCoords(pins);
  assert.equal(spread.length, 3);

  for (const row of spread) {
    assert.equal(row.overlapGroupSize, 3);
    const moved =
      Math.abs(row.spreadLat - row.lat) > 0.00001 ||
      Math.abs(row.spreadLng - row.lng) > 0.00001;
    assert.equal(moved, true);
  }

  const distances = new Set(
    spread.map((row) => `${row.spreadLat.toFixed(5)}:${row.spreadLng.toFixed(5)}`),
  );
  assert.equal(distances.size, 3, "spread pins should not stack");
}

function testSinglePinUnchanged() {
  const spread = spreadOverlappingPinCoords([
    { id: "solo", lat: 33.4996, lng: 126.5312 },
  ]);
  assert.equal(spread[0]!.spreadLat, 33.4996);
  assert.equal(spread[0]!.overlapGroupSize, 1);
}

testSunflowerSpread();
testSinglePinUnchanged();
console.log("test-spread-overlapping-pin-coords: ok");
