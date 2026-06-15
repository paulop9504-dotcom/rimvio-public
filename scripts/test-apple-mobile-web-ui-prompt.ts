#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildAppleMobileWebCardPrompt,
  buildFoodPhotoCardUiPrompt,
  buildPresetAppleMobileWebPrompt,
  APPLE_MOBILE_WEB_CARD_PRESETS,
} from "../lib/design/apple-mobile-web-ui-prompt";

const creativity = buildPresetAppleMobileWebPrompt("creativity");
assert.match(creativity, /창의성/);
assert.match(creativity, /상상력/);
assert.match(creativity, /blue-to-green gradient/);
assert.match(creativity, /image_0\.png/);
assert.match(creativity, /apple\.com/);

const rimvio = buildPresetAppleMobileWebPrompt("rimvioAction", { brand: "rimvio" });
assert.match(rimvio, /rimvio\.app/);
assert.match(rimvio, /링크가 행동/);

const custom = buildAppleMobileWebCardPrompt({
  category: "연결성",
  title: "세상과 더 가깝게.",
  titleGradientWord: "가깝게",
  body: "메시지·영상이 한 흐름으로 이어집니다.",
  graphic: "AirPods with spatial audio and floating musical notes.",
});
assert.match(custom, /연결성/);
assert.match(custom, /AirPods/);

assert.ok(APPLE_MOBILE_WEB_CARD_PRESETS.entertainment.category === "엔터테인먼트");

const food = buildFoodPhotoCardUiPrompt({
  placeName: "쿠우쿠우 도안점",
  photoCount: 4,
});
assert.match(food, /쿠우쿠우 도안점/);
assert.match(food, /NOT a browser screenshot/);
assert.match(buildPresetAppleMobileWebPrompt("foodPhoto"), /맛집/);

console.log("test-apple-mobile-web-ui-prompt: ok");
