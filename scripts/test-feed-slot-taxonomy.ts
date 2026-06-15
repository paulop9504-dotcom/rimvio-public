#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import { buildFeedTodaySlots } from "../lib/feed/build-feed-today-slots";
import {
  buildFeedSlotTaxonomy,
  buildFeedSlotTaxonomyMap,
  collectFeedSlotTaxonomyOptions,
  filterFeedSlotsByTaxonomy,
} from "../lib/feed/feed-slot-taxonomy";
import type { ExperienceVolume } from "../lib/experience-graph/experience-volume-types";

const now = new Date("2026-06-08T10:00:00+09:00");
const windowLabels = {
  today: "오늘의 경험",
  tomorrow: "내일",
  later: "이후",
  unset: "예정",
};

function calendarRow(
  id: string,
  title: string,
  startMs: number,
  dateKey: string,
  eventId: string,
): UnifiedCalendarOverlayRow {
  const date = new Date(startMs);
  return {
    id,
    event: {
      id: `chip:${id}`,
      layer: "action",
      eventId,
      entry: {
        id: `entry:${id}`,
        messageId: null,
        linkId: null,
        reminderId: null,
        kind: "revealed_actions",
        title,
        subtitle: "저장된 일정",
        fireAt: date.toISOString(),
        placeName: id === "a" ? "제주도" : "계산동 722",
        actionCount: 0,
        countdownLabel: "길찾기",
      },
      title,
      dateKey,
      startMs,
      hour: date.getHours(),
      minute: date.getMinutes(),
      tone: "green",
      hasTime: true,
    },
    overlayActions: [],
    prompt_hint: id === "a" ? `제주도 ${title}` : `계산동 ${title}`,
  };
}

const jejuMs = new Date("2026-06-08T14:00:00+09:00").getTime();
const rows = [
  calendarRow("a", "제주도 여행", jejuMs, "2026-06-08", "evt-jeju"),
  calendarRow("b", "계산동 722 준비", jejuMs + 86_400_000, "2026-06-09", "evt-prep"),
];

const { today: slots } = buildFeedTodaySlots({
  primary: null,
  latent: [],
  overlayRows: rows,
  now,
});

const volume: ExperienceVolume = {
  id: "vol-jeju",
  sourceEventId: "evt-jeju",
  eventType: "travel",
  activeLens: "now",
  time: {
    startIso: new Date(jejuMs).toISOString(),
    endIso: null,
    durationHours: null,
  },
  space: {
    label: "제주도 여행",
    lat: 33.4,
    lng: 126.5,
    confidence: 0.8,
  },
  peaks: [],
  media: [],
};

const volumes = new Map([["evt-jeju", volume]]);
const taxonomies = buildFeedSlotTaxonomyMap({
  slots,
  volumesByEventId: volumes,
  windowLabels,
  now,
});

const jejuTaxonomy = buildFeedSlotTaxonomy({
  slot: slots[0]!,
  volumesByEventId: volumes,
  windowLabels,
  now,
});

assert.equal(jejuTaxonomy.l1Label, "여행");
assert.match(jejuTaxonomy.l2Label, /지금/);
assert.match(jejuTaxonomy.l3Label, /제주/);
assert.ok(jejuTaxonomy.searchText.includes("제주"));

const filtered = filterFeedSlotsByTaxonomy({
  slots,
  taxonomies,
  filters: { query: "제주", l1Id: null, l2Id: null, l3Id: null },
});
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.id, slots[0]?.id);

const byL1 = filterFeedSlotsByTaxonomy({
  slots,
  taxonomies,
  filters: { query: "", l1Id: "travel", l2Id: null, l3Id: null },
});
assert.equal(byL1.length, 1);

const options = collectFeedSlotTaxonomyOptions({
  slots,
  taxonomies,
  filters: { query: "", l1Id: "travel", l2Id: null, l3Id: null },
});
assert.ok(options.l2.length >= 1);

console.log("test-feed-slot-taxonomy: ok");
