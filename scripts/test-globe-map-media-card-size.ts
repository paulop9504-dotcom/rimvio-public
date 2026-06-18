import assert from "node:assert/strict";
import {
  clampGlobeMapMediaCardWidth,
  GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT,
  GLOBE_MAP_MEDIA_CARD_WIDTH_MIN,
  touchPairDistance,
} from "@/lib/globe/globe-map-media-card-size";

assert.equal(clampGlobeMapMediaCardWidth(360, 390), 360);
assert.equal(clampGlobeMapMediaCardWidth(200, 390), GLOBE_MAP_MEDIA_CARD_WIDTH_MIN);
assert.equal(clampGlobeMapMediaCardWidth(900, 390), 366);
assert.equal(
  clampGlobeMapMediaCardWidth(GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT, 800),
  GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT,
);
assert.equal(touchPairDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }), 5);

console.log("test-globe-map-media-card-size: ok");
