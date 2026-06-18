import assert from "node:assert/strict";
import {
  MAP_LODGING_FOCUS_ANCHOR_FRACTION,
  MAP_OVERLAY_ANCHOR_FRACTION,
  mapAnchoredOverlayTransform,
  resolveGlobeOffsetForPinViewportY,
} from "@/lib/globe/map-anchored-overlay-layout";

function run() {
  assert.match(
    mapAnchoredOverlayTransform(MAP_OVERLAY_ANCHOR_FRACTION),
    /translate\(-50%, calc\(-55%/,
  );
  assert.match(
    mapAnchoredOverlayTransform(MAP_LODGING_FOCUS_ANCHOR_FRACTION),
    /calc\(-50%/,
  );

  const offset = resolveGlobeOffsetForPinViewportY({
    viewportHeight: 800,
    pinViewportY: 0.58,
  });
  assert.equal(offset[0], 0);
  assert.equal(offset[1], -64);

  const center = resolveGlobeOffsetForPinViewportY({
    viewportHeight: 800,
    pinViewportY: 0.5,
  });
  assert.deepEqual(center, [0, 0]);

  console.log("test-map-anchored-overlay-layout: ok");
}

run();
