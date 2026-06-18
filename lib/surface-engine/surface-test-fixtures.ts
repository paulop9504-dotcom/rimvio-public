import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LifeProjections } from "@/lib/life-read-model/types";
import type { SurfaceBuildContext } from "@/lib/surface-engine/surface-contract";

const NOW = new Date("2026-06-07T10:00:00.000Z");

function baseEvent(partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title">): EventCandidate {
  return {
    category: "schedule",
    source: "chat",
    lifecycle: "scheduled",
    confidence: 0.82,
    lifecycleUpdatedAt: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...partial,
  };
}

export const FIXTURE_OSAKA_TRAVEL: EventCandidate = baseEvent({
  id: "ec-osaka-1",
  title: "다음 주 오사카 여행",
  category: "travel",
  datetime: "2026-06-14T09:00:00.000Z",
  place: "오사카",
});

export const FIXTURE_CHICKEN_DINNER: EventCandidate = baseEvent({
  id: "ec-chicken-1",
  title: "토요일 7시 치킨집",
  category: "social",
  datetime: "2026-06-08T19:00:00.000Z",
  place: "치킨집",
});

export const FIXTURE_STARTUP_GOAL: EventCandidate = baseEvent({
  id: "ec-startup-1",
  title: "창업하고 싶어",
  category: "work",
  lifecycle: "mentioned",
});

export const FIXTURE_REMINDER: EventCandidate = baseEvent({
  id: "ec-reminder-1",
  title: "3분 뒤 알려줘",
  category: "schedule",
  lifecycle: "confirmed",
});

export const FIXTURE_LIFE_PROJECTIONS: LifeProjections = {
  dateKey: "2026-06-07",
  events: [
    FIXTURE_OSAKA_TRAVEL,
    FIXTURE_CHICKEN_DINNER,
    FIXTURE_STARTUP_GOAL,
    FIXTURE_REMINDER,
  ],
  existingSchedule: [{ time: "19:00", task: "토요일 7시 치킨집" }],
  allReminders: [],
};

export const FIXTURE_BUILD_CONTEXT: SurfaceBuildContext = {
  now: NOW,
  dateKey: "2026-06-07",
  completedActionIds: [],
  dismissedSurfaceIds: [],
};

export const FIXTURE_TRAVEL_AFTER_FLIGHT: SurfaceBuildContext = {
  ...FIXTURE_BUILD_CONTEXT,
  completedActionIds: ["surface:ec:ec-osaka-1:BOOK_FLIGHT"],
};

export const FIXTURE_TRAVEL_AFTER_HOTEL: SurfaceBuildContext = {
  ...FIXTURE_BUILD_CONTEXT,
  completedActionIds: [
    "surface:ec:ec-osaka-1:BOOK_FLIGHT",
    "surface:ec:ec-osaka-1:BOOK_HOTEL",
  ],
};

export const FIXTURE_EMPTY_LIFE: LifeProjections = {
  dateKey: "2026-06-07",
  events: [],
  existingSchedule: [],
  allReminders: [],
};

export const FIXTURE_LOW_SIGNAL_OSAKA: EventCandidate = baseEvent({
  id: "ec-osaka-frag",
  title: "오사카",
  category: "travel",
  lifecycle: "mentioned",
  confidence: 0.42,
  place: "오사카",
});

export const FIXTURE_LOW_SIGNAL_TRIP: EventCandidate = baseEvent({
  id: "ec-trip-frag",
  title: "오사카 여행",
  category: "travel",
  lifecycle: "mentioned",
  confidence: 0.38,
});

export const FIXTURE_LOW_SIGNAL_LIFE: LifeProjections = {
  dateKey: "2026-06-07",
  events: [FIXTURE_LOW_SIGNAL_OSAKA, FIXTURE_LOW_SIGNAL_TRIP],
  existingSchedule: [],
  allReminders: [],
};

function overloadEvent(index: number): EventCandidate {
  return baseEvent({
    id: `ec-overload-${index}`,
    title: `일정 후보 ${index}`,
    category: "schedule",
    datetime: `2026-06-${String(8 + (index % 20)).padStart(2, "0")}T${String(9 + index).padStart(2, "0")}:00:00.000Z`,
    lifecycle: index % 2 === 0 ? "scheduled" : "confirmed",
  });
}

export const FIXTURE_OVERLOAD_LIFE: LifeProjections = {
  dateKey: "2026-06-07",
  events: Array.from({ length: 8 }, (_, index) => overloadEvent(index)),
  existingSchedule: [],
  allReminders: [],
};
