import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { resolveGlobeAlbumScanRange } from "../lib/globe/resolve-globe-album-scan-range";
import { scoreAlbumItemAgainstGlobeContexts } from "../lib/globe/score-album-item-against-contexts";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const pastCtx = createManualGlobeContext({
    title: "작년 제주",
    place: "제주",
    startIso: "2025-01-10T10:00",
    nights: 2,
    resolvedPlace: {
      label: "제주",
      placeName: "제주",
      lat: 33.4996,
      lng: 126.5312,
      confirmed: true,
    },
  });

  const now = new Date("2026-06-10T12:00:00+09:00");
  const range = resolveGlobeAlbumScanRange({
    events: [pastCtx.event],
    prefsWindowDays: 7,
    now,
  });

  assert.equal(range.hasContextWindows, true);
  assert.ok(range.sinceMs < Date.parse("2025-01-10T10:00:00+09:00"));

  const hit = scoreAlbumItemAgainstGlobeContexts({
    item: {
      capturedAtIso: "2025-01-11T15:00:00+09:00",
      lat: 33.51,
      lng: 126.52,
    },
    events: [pastCtx.event],
    now,
  });
  assert.equal(hit.matches, true);
  assert.equal(hit.eventId, pastCtx.event.id);

  const miss = scoreAlbumItemAgainstGlobeContexts({
    item: {
      capturedAtIso: "2026-06-01T12:00:00+09:00",
      lat: 37.5665,
      lng: 126.978,
    },
    events: [pastCtx.event],
    now,
  });
  assert.equal(miss.matches, false);

  console.log("test-globe-album-scan-range: ok");
}

main();
