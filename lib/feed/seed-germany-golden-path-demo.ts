import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listEventCandidates,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  FEED_CAPTURE_PENDING_VERIFY_META_KEY,
  FEED_CAPTURE_STATS_META_KEY,
  FEED_CAPTURES_META_KEY,
} from "@/lib/feed/feed-capture-types";
import { resetGpsArrivalRecallSessionForTests } from "@/lib/feed/gps-arrival-recall-session";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { appendGpsPing } from "@/lib/location-ping/gps-ping-store";

/** Stable ids — tests + `/feed?golden=germany` manual golden path. */
export const GERMANY_GOLDEN_GROUP_THREAD_ID =
  "peer-group-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const GERMANY_GOLDEN_PAST_EVENT_ID = "rimvio-golden-germany-2024";
export const GERMANY_GOLDEN_ACTIVE_EVENT_ID = "rimvio-golden-germany-2026";
export const GERMANY_GOLDEN_QUERY = "germany";

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function buildGermanyTripWindow(now = new Date()): {
  windowStart: Date;
  windowEnd: Date;
  calendarAnchor: Date;
} {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 2);
  windowStart.setHours(9, 0, 0, 0);

  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 9);
  windowEnd.setHours(20, 0, 0, 0);

  const calendarAnchor = new Date(now);
  calendarAnchor.setMinutes(0, 0, 0);
  if (calendarAnchor.getTime() > now.getTime()) {
    calendarAnchor.setHours(calendarAnchor.getHours() - 1);
  }

  return { windowStart, windowEnd, calendarAnchor };
}

export function buildGermanyGoldenPathDrafts(now = new Date()): {
  past: EventCandidate;
  active: EventCandidate;
} {
  const { windowStart, windowEnd, calendarAnchor } = buildGermanyTripWindow(now);
  const stamp = now.toISOString();

  const day3 = new Date(windowStart);
  day3.setDate(day3.getDate() + 2);
  day3.setHours(14, 0, 0, 0);

  const day5 = new Date(windowStart);
  day5.setDate(day5.getDate() + 4);
  day5.setHours(11, 30, 0, 0);

  const past: EventCandidate = {
    id: GERMANY_GOLDEN_PAST_EVENT_ID,
    title: "독일 여행",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    datetime: "2024-07-01T09:00:00+09:00",
    place: "독일",
    confidence: 0.92,
    metadata: {
      feedPlanEnabled: true,
      planKind: "plan",
      planPeerThreadId: GERMANY_GOLDEN_GROUP_THREAD_ID,
      planPeerDisplayName: "A,B,C 단톡",
      planWindowStartIso: "2024-07-01T09:00:00+09:00",
      planWindowEndIso: "2024-07-10T20:00:00+09:00",
      planNights: 9,
      planMode: "group",
      germanyGoldenDemo: true,
      [FEED_CAPTURES_META_KEY]: [
        {
          id: "golden-cap-brandenburg",
          kind: "photo",
          capturedAtIso: "2024-07-03T15:00:00+09:00",
          placeLabel: "베를린",
          label: "브란덴부르크 문",
          verified: true,
        },
        {
          id: "golden-cap-munich",
          kind: "photo",
          capturedAtIso: "2024-07-06T12:00:00+09:00",
          placeLabel: "뮌헨",
          label: "마리엔 광장",
          verified: true,
        },
        {
          id: "golden-cap-abc",
          kind: "memo",
          capturedAtIso: "2024-07-08T20:00:00+09:00",
          placeLabel: "독일",
          label: "A,B,C 단톡 마지막 밤",
          verified: true,
        },
      ],
      [FEED_CAPTURE_STATS_META_KEY]: {
        photos: 2,
        videos: 0,
        links: 0,
        memos: 1,
      },
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };

  const active: EventCandidate = {
    id: GERMANY_GOLDEN_ACTIVE_EVENT_ID,
    title: "독일 10일 여행",
    category: "travel",
    source: "message",
    lifecycle: "active",
    datetime: toLocalEventIso(calendarAnchor),
    place: "독일",
    confidence: 0.94,
    metadata: {
      feedPlanEnabled: true,
      planKind: "plan",
      planPeerThreadId: GERMANY_GOLDEN_GROUP_THREAD_ID,
      planPeerDisplayName: "A,B,C",
      planWindowStartIso: toLocalEventIso(windowStart),
      planWindowEndIso: toLocalEventIso(windowEnd),
      planNights: 9,
      planWindowConfidence: "confirmed",
      planMode: "group",
      germanyGoldenDemo: true,
      experiencePeerNames: ["A", "B", "C"],
      [FEED_CAPTURES_META_KEY]: [
        {
          id: "golden-cap-arrival-dwell",
          kind: "gps_dwell",
          capturedAtIso: toLocalEventIso(day3),
          placeLabel: "베를린",
          label: "베를린 도착",
          dwellMinutes: 25,
          autoAttached: true,
          verified: false,
        },
      ],
      [FEED_CAPTURE_STATS_META_KEY]: {
        photos: 0,
        videos: 0,
        links: 0,
        memos: 0,
      },
      [FEED_CAPTURE_PENDING_VERIFY_META_KEY]: true,
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };

  return { past, active };
}

function upsertGoldenEvent(draft: EventCandidate): EventCandidate {
  return upsertEventCandidate({
    id: draft.id,
    title: draft.title,
    category: draft.category,
    source: draft.source,
    lifecycle: draft.lifecycle,
    datetime: draft.datetime,
    place: draft.place,
    confidence: draft.confidence,
    metadata: draft.metadata,
  });
}

async function simulateBerlinArrival(now = new Date()): Promise<void> {
  resetGpsArrivalRecallSessionForTests();

  const depart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  await appendGpsPing({
    lat: 37.566,
    lng: 126.978,
    accuracyM: 25,
    source: "periodic",
    capturedAtIso: depart.toISOString(),
  });
  await appendGpsPing({
    lat: 52.52,
    lng: 13.405,
    accuracyM: 18,
    source: "periodic",
    capturedAtIso: now.toISOString(),
  });
}

function seedPeerRoster(): void {
  addPeerContact({
    peerThreadId: GERMANY_GOLDEN_GROUP_THREAD_ID,
    displayName: "A,B,C",
    roomDisplayName: "A,B,C 단톡",
  });
}

export type EnsureGermanyGoldenPathResult = {
  past: EventCandidate;
  active: EventCandidate;
  simulatedArrival: boolean;
};

/**
 * Manual golden path — A/B/C Germany trip replay in one URL.
 * Open `/feed?golden=germany` (optionally `&simulateArrival=0` to skip GPS inject).
 */
export async function ensureGermanyGoldenPathDemo(input?: {
  now?: Date;
  simulateArrival?: boolean;
  force?: boolean;
}): Promise<EnsureGermanyGoldenPathResult | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const now = input?.now ?? new Date();
  const force = input?.force ?? false;
  const existing = listEventCandidates();
  const alreadySeeded = existing.some(
    (row) => row.metadata?.germanyGoldenDemo === true,
  );

  if (!force && alreadySeeded) {
    const past =
      existing.find((row) => row.id === GERMANY_GOLDEN_PAST_EVENT_ID) ?? null;
    const active =
      existing.find((row) => row.id === GERMANY_GOLDEN_ACTIVE_EVENT_ID) ?? null;
    if (past && active) {
      return { past, active, simulatedArrival: false };
    }
  }

  const drafts = buildGermanyGoldenPathDrafts(now);
  const past = upsertGoldenEvent(drafts.past);
  const active = upsertGoldenEvent(drafts.active);
  seedPeerRoster();

  createPersonalGlobePinFromEvent({
    event: past,
    experienceTitle: past.title,
    shareWithPeerThreadIds: [GERMANY_GOLDEN_GROUP_THREAD_ID],
  });
  createPersonalGlobePinFromEvent({
    event: active,
    experienceTitle: active.title,
    shareWithPeerThreadIds: [GERMANY_GOLDEN_GROUP_THREAD_ID],
  });

  const simulateArrival = input?.simulateArrival ?? true;
  if (simulateArrival) {
    await simulateBerlinArrival(now);
  }

  return { past, active, simulatedArrival: simulateArrival };
}
