import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listEventCandidates,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import {
  FEED_CAPTURE_PENDING_VERIFY_META_KEY,
  FEED_CAPTURE_STATS_META_KEY,
  FEED_CAPTURES_META_KEY,
} from "@/lib/feed/feed-capture-types";

export const FEED_PLAN_DEMO_EVENT_ID = "rimvio-feed-plan-demo";
export const FEED_PLAN_DEMO_PEER_THREAD_ID = "rimvio-feed-demo-minsu";

function roundToNextQuarterHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 15;
  if (remainder !== 0) {
    next.setMinutes(next.getMinutes() + (15 - remainder));
  }
  return next;
}

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

function buildJejuWowWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  if (start.getTime() > now.getTime()) {
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  end.setHours(20, 0, 0, 0);
  return { start, end };
}

export function buildFeedPlanDemoDraft(now = new Date()): EventCandidate {
  const { start, end } = buildJejuWowWindow(now);
  const day2 = new Date(start);
  day2.setDate(day2.getDate() + 1);
  day2.setHours(14, 20, 0, 0);

  return {
    id: FEED_PLAN_DEMO_EVENT_ID,
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: toLocalEventIso(day2),
    place: "제주",
    confidence: 0.92,
    metadata: {
      feedPlanEnabled: true,
      planKind: "plan",
      planWindowEndIso: toLocalEventIso(end),
      planWindowStartIso: toLocalEventIso(start),
      planNights: 2,
      planWindowConfidence: "confirmed",
      planPeerDisplayName: "민수",
      planPeerThreadId: FEED_PLAN_DEMO_PEER_THREAD_ID,
      planMode: "group",
      sourceMessageId: "feed-demo-jeju-thread-msg",
      feedDemo: true,
      [FEED_CAPTURES_META_KEY]: [
        {
          id: "feed-demo-cap-photo",
          kind: "photo",
          capturedAtIso: toLocalEventIso(day2),
          placeLabel: "제주",
          label: "민수랑 제주",
          autoAttached: true,
          verified: false,
        },
      ],
      [FEED_CAPTURE_STATS_META_KEY]: {
        photos: 1,
        videos: 0,
        links: 0,
        memos: 0,
      },
      [FEED_CAPTURE_PENDING_VERIFY_META_KEY]: true,
    },
    lifecycleUpdatedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function demoNeedsRefresh(existing: EventCandidate, now: Date): boolean {
  const endIso =
    typeof existing.metadata?.planWindowEndIso === "string"
      ? existing.metadata.planWindowEndIso
      : null;
  const startMs = existing.datetime ? Date.parse(existing.datetime) : Number.NaN;
  const endMs = endIso ? Date.parse(endIso) : Number.NaN;
  const nowMs = now.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return true;
  }
  return nowMs < startMs - 3_600_000 || nowMs > endMs + 3_600_000;
}

/** Feed tab demo — seeds one plan-backed slot when the user has no real events yet. */
export function ensureFeedPlanDemoEvent(now = new Date()): EventCandidate | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = listEventCandidates();
  const hasUserEvents = existing.some(
    (item) => item.id !== FEED_PLAN_DEMO_EVENT_ID && !item.metadata?.feedDemo,
  );
  if (hasUserEvents) {
    return null;
  }

  const demo = existing.find((item) => item.id === FEED_PLAN_DEMO_EVENT_ID);
  if (demo && !demoNeedsRefresh(demo, now)) {
    return demo;
  }

  const draft = buildFeedPlanDemoDraft(now);
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
