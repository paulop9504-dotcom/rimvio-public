import assert from "node:assert/strict";
import {
  resolveMainActionBrandStyle,
  resolveNavAuxBrandStyle,
} from "../lib/brand/action-brand-style";

const kakaoMap = resolveMainActionBrandStyle({
  label: "카카오맵",
  deeplink: "https://map.kakao.com/link/search/강남역",
});
assert.equal(kakaoMap.textColor, "#FEE500");
assert.equal(kakaoMap.fillColor, "transparent");
assert.equal(kakaoMap.borderColor, "rgba(255, 255, 255, 0.85)");

const naver = resolveMainActionBrandStyle({
  id: "naver",
  label: "네이버",
  deeplink: "nmap://search?query=test",
});
assert.equal(naver.textColor, "#03C75A");
assert.equal(naver.fillColor, "transparent");

const toss = resolveMainActionBrandStyle({
  provider: "toss",
  label: "토스 5만원",
  deeplink: "supertoss://",
});
assert.equal(toss.textColor, "#0064FF");

const taxi = resolveMainActionBrandStyle({
  plugin: "kakao.taxi",
  label: "카카오T 호출",
  type: "TAXI",
});
assert.equal(taxi.textColor, "#FEE500");

const navAuxN = resolveNavAuxBrandStyle("naver", "N", "네이버");
assert.equal(navAuxN.iconColor, "#03C75A");
assert.equal(navAuxN.iconBg, "transparent");

const navAuxT = resolveNavAuxBrandStyle("taxi", "T", "카카오T");
assert.equal(navAuxT.iconColor, "#FEE500");
assert.equal(navAuxT.iconBg, "transparent");

const transferAuxToss = resolveNavAuxBrandStyle("toss", "◎", "토스");
assert.equal(transferAuxToss.iconColor, "#0064FF");
assert.equal(transferAuxToss.iconBg, "transparent");

console.log("test-action-brand-style: ok");
