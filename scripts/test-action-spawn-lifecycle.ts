#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveLifecycleSpawnPhase } from "../lib/action-spawn/resolve-lifecycle-phase";
import { resolvePluginDeeplink } from "../lib/action-spawn/resolve-plugin-deeplink";
import { generateSecondaryActions } from "../lib/secondary-action-generator/generate-secondary-actions";

const travel = resolveLifecycleSpawnPhase(
  {
    title: "중요 파트너사 외부 미팅 (강남역)",
    location: "강남역",
    minutes_until_event: 45,
  },
  new Date("2026-06-03T09:15:00"),
);
assert.equal(travel.phase, "travel");
assert.ok(travel.prompt_hint?.includes("이동"));

const onSite = resolveLifecycleSpawnPhase(
  {
    title: "중요 파트너사 외부 미팅 (강남역)",
    location: "강남역",
    minutes_until_event: 5,
  },
  new Date("2026-06-03T09:55:00"),
);
assert.equal(onSite.phase, "on_site");

const onSiteAux = generateSecondaryActions({
  main_action: { id: "main", label: "미팅 열기", plugin: "calendar.view" },
  event: {
    title: "중요 파트너사 외부 미팅 (강남역)",
    spawn_phase: "on_site",
    minutes_until_event: 5,
  },
});
assert.ok(onSiteAux.some((item) => item.label.includes("PDF")));
assert.ok(onSiteAux.some((item) => item.label.includes("QR")));

const prepAux = generateSecondaryActions({
  main_action: { id: "main", label: "헬스장 PT", plugin: "gym.barcode" },
  event: {
    title: "헬스장 개인 PT 세션",
    spawn_phase: "prep",
    minutes_until_event: 90,
  },
});
assert.ok(prepAux.some((item) => item.label.includes("샐러드")));
assert.ok(prepAux.some((item) => item.label.includes("바코드")));

const taxiLink = resolvePluginDeeplink("kakao.taxi", { destination: "강남역" });
assert.ok(taxiLink?.includes("kakao.com"));

console.log("test-action-spawn-lifecycle: ok");
