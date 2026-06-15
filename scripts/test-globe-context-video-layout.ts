import assert from "node:assert/strict";
import {
  isGlobeContextVideoScreenVisible,
  MAP_CONTEXT_MEDIA_SIZE_MULTIPLIER,
  resolveGlobeContextVideoScale,
  resolveGlobeContextVideoScreenLayout,
  resolveGlobeContextVideoWidthPx,
} from "../lib/globe/resolve-globe-context-video-layout";
import { GLOBE_ALTITUDE } from "../lib/globe/globe-zoom-levels";

function testScaleShrinksOnZoomOut() {
  const close = resolveGlobeContextVideoScale(GLOBE_ALTITUDE.neighborhood);
  const far = resolveGlobeContextVideoScale(GLOBE_ALTITUDE.region);
  assert.equal(close, 1);
  assert.ok(far < close);
  assert.ok(far >= 0.06);
}

function testWidthScalesWithViewport() {
  const width = resolveGlobeContextVideoWidthPx(1, 400);
  assert.equal(width, Math.round(168 * MAP_CONTEXT_MEDIA_SIZE_MULTIPLIER));
  const small = resolveGlobeContextVideoWidthPx(0.2, 400);
  assert.ok(small < width);
  assert.ok(small >= 36);
}

function testOffScreenHidden() {
  const layout = resolveGlobeContextVideoScreenLayout({
    screen: { x: -200, y: 50 },
    altitude: GLOBE_ALTITUDE.neighborhood,
    viewportWidth: 390,
    viewportHeight: 844,
  });
  assert.equal(layout, null);
  assert.equal(
    isGlobeContextVideoScreenVisible({ x: 100, y: 100 }, 390, 844),
    true,
  );
}

testScaleShrinksOnZoomOut();
testWidthScalesWithViewport();
testOffScreenHidden();
console.log("test-globe-context-video-layout: ok");
