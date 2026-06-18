#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import {
  EXPERIENCE_INTENTS,
  mapIntentToCategory,
  readExperienceIntentFromEvent,
  resolveAndStampExperienceIntent,
  resolveExperienceIntent,
  stampExperienceIntentMetadata,
} from "../lib/experience-intent";
import { resolveExperienceEventType } from "../lib/experience-graph/resolve-experience-event-type";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-intent-test",
    title: "테스트",
    category: "schedule",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function captures(rows: Partial<FeedCaptureFragment>[]): FeedCaptureFragment[] {
  return rows.map((row, index) => ({
    id: row.id ?? `cap-${index}`,
    kind: row.kind ?? "photo",
    capturedAtIso: row.capturedAtIso ?? new Date().toISOString(),
    ...row,
  }));
}

assert.equal(EXPERIENCE_INTENTS.length, 14);

const wedding = resolveExperienceIntent(
  baseEvent({
    title: "민수 결혼식",
    category: "social",
    metadata: {
      planPeerThreadId: "peer-group-abc",
      planPeerDisplayName: "민수",
      attendees: Array.from({ length: 10 }, (_, i) => `guest-${i}`),
      feedCaptures: captures(
        Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, kind: "photo" as const })),
      ),
    },
  }),
);
assert.equal(wedding.intent, "wedding");
assert.ok(wedding.confidence >= 60);
assert.ok(wedding.evidence.some((row) => row.signal.includes("wedding")));

const businessTrip = resolveExperienceIntent(
  baseEvent({ title: "독일 출장", category: "travel" }),
);
assert.equal(businessTrip.intent, "business");
assert.ok(businessTrip.score > 0);

const leisureTravel = resolveExperienceIntent(
  baseEvent({
    title: "제주도 여행",
    category: "travel",
    metadata: {
      planPeerThreadId: "peer-dm-a__b",
      feedCaptures: captures([
        { kind: "gps_dwell", placeLabel: "제주시" },
        { kind: "gps_dwell", placeLabel: "애월" },
      ]),
    },
  }),
);
assert.equal(leisureTravel.intent, "travel");

const sport = resolveExperienceIntent(
  baseEvent({ title: "한라산 등산", category: "schedule" }),
);
assert.equal(sport.intent, "sports");
assert.equal(resolveExperienceEventType(baseEvent({ title: "한라산 등산" })), "sport");

const birthday = resolveExperienceIntent(
  baseEvent({ title: "민수 생일 파티", category: "social" }),
);
assert.equal(birthday.intent, "birthday");

const hospital = resolveExperienceIntent(
  baseEvent({
    title: "치과 예약",
    place: "서울치과의원",
    category: "schedule",
  }),
);
assert.equal(hospital.intent, "hospital");

const school = resolveExperienceIntent(
  baseEvent({ title: "대학교 수업", place: "캠퍼스", category: "schedule" }),
);
assert.equal(school.intent, "school");

const concert = resolveExperienceIntent(
  baseEvent({
    title: "아이유 콘서트",
    metadata: {
      feedCaptures: captures([{ kind: "video", id: "v1" }]),
    },
  }),
);
assert.equal(concert.intent, "concert");
assert.equal(resolveExperienceEventType(baseEvent({ title: "아이유 콘서트" })), "concert");

const meeting = resolveExperienceIntent(
  baseEvent({
    title: "내일 1시 스타벅스에서 만나 약속",
    metadata: {
      planPeerThreadId: "peer-dm-x__y",
      planPeerDisplayName: "민수",
    },
  }),
);
assert.equal(meeting.intent, "meeting");

const funeral = resolveExperienceIntent(
  baseEvent({ title: "장례식 조문", place: "○○장례식장" }),
);
assert.equal(funeral.intent, "funeral");

const food = resolveExperienceIntent(
  baseEvent({ title: "강남 파스타 맛집", category: "food" }),
);
assert.equal(food.intent, "food");

const gcalWedding = resolveExperienceIntent(
  baseEvent({
    title: "민수 결혼식",
    category: "schedule",
    metadata: {
      sourceRef: "google-calendar",
      description: "예식 2시",
      attendees: ["민수", "지수", "가족", "친구1", "친구2", "친구3", "친구4", "친구5"],
    },
  }),
);
assert.equal(gcalWedding.intent, "wedding");

assert.equal(mapIntentToCategory("wedding"), "social");
assert.equal(mapIntentToCategory("travel"), "travel");
assert.equal(mapIntentToCategory("business"), "work");

const stamped = resolveAndStampExperienceIntent(
  baseEvent({ title: "제주도 여행", category: "travel" }),
);
assert.equal(stamped.resolution.intent, "travel");
assert.equal(stamped.event.metadata?.experienceIntent, "travel");
assert.equal(typeof stamped.event.metadata?.experienceIntentConfidence, "number");

const readBack = readExperienceIntentFromEvent(stamped.event);
assert.ok(readBack);
assert.equal(readBack?.intent, "travel");

const metaOnly = stampExperienceIntentMetadata(
  {},
  resolveExperienceIntent(baseEvent({ title: "무작위 메모", category: "custom" })),
);
assert.ok(metaOnly.experienceIntent);

console.log("test-resolve-experience-intent: ok");
