import assert from "node:assert/strict";
import {
  classifyOverseasManualPlace,
  overseasPlaceConfirmPrompt,
} from "../lib/globe/classify-overseas-manual-place";
import { parseManualContextPlaceText } from "../lib/globe/parse-manual-context-place-text";
import { resolveManualContextPlaceCandidates } from "../lib/globe/resolve-manual-context-place-candidates";
import { resolvePlaceCoordinates } from "../lib/experience-graph/resolve-place-coordinates";

async function main() {
  const sinlim = parseManualContextPlaceText("약속장소 신림동에서 만나자");
  assert.equal(sinlim.displayLabel, "신림동");
  assert.match(sinlim.searchQuery, /신림동/u);
  assert.match(sinlim.searchQuery, /서울/u);
  assert.equal(classifyOverseasManualPlace("신림동"), null);

  const gangnam = parseManualContextPlaceText("강남역 스타벅스에서 만나요");
  assert.match(gangnam.displayLabel, /강남역/u);

  const shanghai = classifyOverseasManualPlace("상하이");
  assert.ok(shanghai);
  assert.equal(shanghai!.label, "상하이");
  assert.equal(shanghai!.kind, "city");
  assert.match(shanghai!.geocodeQuery, /Shanghai/iu);
  assert.match(overseasPlaceConfirmPrompt(shanghai!), /상하이/u);

  const hongkong = classifyOverseasManualPlace("홍콩 여행");
  assert.ok(hongkong);
  assert.equal(hongkong!.label, "홍콩");

  const china = classifyOverseasManualPlace("중국");
  assert.ok(china);
  assert.equal(china!.kind, "country");
  assert.match(overseasPlaceConfirmPrompt(china!), /어느 도시/u);

  const hawaii = classifyOverseasManualPlace("하와이");
  assert.ok(hawaii);
  assert.equal(hawaii!.label, "하와이");
  assert.equal(hawaii!.countryLabel, "미국");
  assert.match(hawaii!.geocodeQuery, /Hawaii/iu);

  const hawaiiTrip = parseManualContextPlaceText("하와이 여행");
  assert.equal(hawaiiTrip.displayLabel, "하와이");
  assert.match(hawaiiTrip.searchQuery, /Hawaii/iu);

  const paris = classifyOverseasManualPlace("프랑스 파리");
  assert.ok(paris);
  assert.equal(paris!.label, "파리");

  const hawaiiCoords = resolvePlaceCoordinates("하와이");
  assert.ok(hawaiiCoords.lat > 19 && hawaiiCoords.lat < 23);
  assert.ok(hawaiiCoords.lng > -160 && hawaiiCoords.lng < -154);

  const shanghaiCoords = resolvePlaceCoordinates("상하이");
  assert.ok(shanghaiCoords.lat > 30 && shanghaiCoords.lat < 32);
  assert.ok(shanghaiCoords.lng > 120 && shanghaiCoords.lng < 123);

  const resolved = await resolveManualContextPlaceCandidates({
    place: "약속장소 신림동에서 만나자",
    title: "민수 약속",
  });
  assert.equal(resolved.parsed.displayLabel, "신림동");
  assert.equal(resolved.overseas, null);
  assert.ok(
    resolved.autoResolved || resolved.suggestions.length > 0,
    "expected auto resolve or geocode candidates",
  );
  if (resolved.autoResolved) {
    assert.ok(resolved.autoResolved.lat > 37 && resolved.autoResolved.lat < 38);
    assert.ok(resolved.autoResolved.lng > 126 && resolved.autoResolved.lng < 127);
  }

  const overseasResolved = await resolveManualContextPlaceCandidates({
    place: "상하이",
    title: "상하이 출장",
  });
  assert.ok(overseasResolved.overseas);
  assert.equal(overseasResolved.autoResolved, null);
  assert.ok(overseasResolved.approximateFallback);
  assert.ok(overseasResolved.approximateFallback!.lat > 30);
  assert.match(overseasResolved.ux.prompt, /상하이/u);

  console.log("test-parse-manual-context-place: ok");
}

void main();
