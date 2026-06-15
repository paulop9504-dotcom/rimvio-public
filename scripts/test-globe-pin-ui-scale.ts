import assert from "node:assert/strict";
import {
  globePinUiScaleForDetailLevel,
  resolveGlobePinUiScale,
  resolveGlobePinUiScaleBlended,
} from "../lib/globe/resolve-globe-pin-ui-scale";
import { GLOBE_ALTITUDE } from "../lib/globe/globe-zoom-levels";

function testPinScaleShrinksOnZoomOut() {
  const close = resolveGlobePinUiScale(GLOBE_ALTITUDE.neighborhood);
  const far = resolveGlobePinUiScale(GLOBE_ALTITUDE.overview);
  assert.ok(close > far);
  assert.ok(far <= 0.04);
  assert.ok(close <= 1);
}

function testBlendedCapsByDetailLevel() {
  assert.ok(
    resolveGlobePinUiScaleBlended(GLOBE_ALTITUDE.overview, "space") <=
      globePinUiScaleForDetailLevel("space"),
  );
  assert.ok(
    resolveGlobePinUiScaleBlended(GLOBE_ALTITUDE.region, "region") <=
      globePinUiScaleForDetailLevel("region"),
  );
  assert.ok(
    resolveGlobePinUiScaleBlended(GLOBE_ALTITUDE.neighborhood, "pin") <= 1,
  );
}

testPinScaleShrinksOnZoomOut();
testBlendedCapsByDetailLevel();
console.log("test-globe-pin-ui-scale: ok");
