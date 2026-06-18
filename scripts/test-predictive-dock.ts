import assert from "node:assert/strict";
import {
  computePredictiveDock,
  shouldSurfaceTripDock,
  visibleDockActions,
} from "../lib/predictive-dock/compute-predictive-dock";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetTripStoreForTests } from "../lib/trip-controller/trip-store";
import type { TripRecord } from "../lib/trip-controller/types";

const referenceDate = "2026-05-31";

function at(hour: number, minute = 0) {
  return new Date(`${referenceDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
}

function seedDentistEvent(lifecycle: "mentioned" | "confirmed" | "scheduled" | "active" = "scheduled") {
  const now = new Date().toISOString();
  resetEventCandidatesForTests([
    {
      id: "ec-dock-dentist",
      title: "치과",
      category: "schedule",
      source: "message",
      lifecycle,
      datetime: `${referenceDate}T17:00:00`,
      place: "치과",
      confidence: 0.9,
      metadata: { sourceMessage: "내일 치과 있는데" },
      lifecycleUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

seedDentistEvent("scheduled");

const far = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(10, 0),
});
assert.ok(far.shadow_actions.some((item) => item.type === "INFO"));
assert.equal(far.main_action, null);
assert.equal(far.shadow_actions[0]?.anchorId, "ec-dock-dentist");

const oneHour = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(16, 0),
});
assert.ok(oneHour.shadow_actions.some((item) => item.type === "NAVIGATE"));

const twentyMin = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(16, 40),
});
assert.equal(twentyMin.main_action?.type, "NAVIGATE");
assert.ok(twentyMin.main_action!.score >= 80);

const fiveMin = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(16, 55),
});
assert.equal(fiveMin.main_action?.label, "네비");

const convo = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(16, 0),
  lastUserMessage: "전화줌",
});
assert.ok(
  visibleDockActions(convo).some((item) => item.type === "CALL" || item.type === "NAVIGATE")
);

resetEventCandidatesForTests([]);

const tripFixture: TripRecord = {
  id: "trip-dock-test",
  title: "도쿄 여행",
  destination: "도쿄",
  departureIso: `${referenceDate}T18:00:00`,
  airportLabel: "인천공항",
  status: "DEPARTURE_24H",
  flight: null,
  packing: {
    tripId: "trip-dock-test",
    templateId: "AIRPORT_TRAVEL_01",
    destinationLabel: "도쿄",
    items: [{ id: "p1", item: "여권", checked: false }],
    updatedAt: `${referenceDate}T08:00:00`,
  },
  createdAt: `${referenceDate}T08:00:00`,
  updatedAt: `${referenceDate}T08:00:00`,
};

resetTripStoreForTests([tripFixture]);

const foodQueryDock = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(10, 0),
  lastUserMessage: "대전 치킨 맛집 추천",
});
assert.equal(
  visibleDockActions(foodQueryDock).some((item) => item.label === "체크인"),
  false,
  "food discovery must hide stale trip dock"
);

const travelQueryDock = computePredictiveDock({
  messages: [
    {
      id: "u-travel",
      role: "user",
      text: "인천공항 택시 불러줘",
      createdAt: `${referenceDate}T09:50:00`,
    },
  ],
  referenceDate,
  now: at(10, 0),
  lastUserMessage: "인천공항 택시 불러줘",
});
assert.ok(
  visibleDockActions(travelQueryDock).some((item) => item.label === "택시 호출"),
  "travel context should surface trip dock"
);

const evaluated = {
  ...tripFixture,
  status: "DEPARTURE_24H" as const,
  minutesUntilDeparture: 480,
  packingComplete: false,
  packingProgress: { done: 0, total: 1 },
};
assert.equal(
  shouldSurfaceTripDock(evaluated, {
    messages: [],
    lastUserMessage: "대전 치킨 맛집 추천",
  }),
  false
);
assert.equal(
  shouldSurfaceTripDock(evaluated, {
    messages: [],
    lastUserMessage: "체크인 도와줘",
  }),
  true
);

resetTripStoreForTests([]);
resetEventCandidatesForTests([]);

// Lifecycle filter — archived and candidate must not surface in dock
resetEventCandidatesForTests([
  {
    id: "ec-archived",
    title: "숨김 일정",
    category: "schedule",
    source: "message",
    lifecycle: "archived",
    datetime: `${referenceDate}T12:00:00`,
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ec-candidate",
    title: "후보 일정",
    category: "schedule",
    source: "message",
    lifecycle: "candidate",
    datetime: `${referenceDate}T13:00:00`,
    confidence: 0.5,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ec-visible",
    title: "보이는 일정",
    category: "schedule",
    source: "message",
    lifecycle: "mentioned",
    datetime: `${referenceDate}T14:00:00`,
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);
const filteredDock = computePredictiveDock({
  messages: [],
  referenceDate,
  now: at(10, 0),
});
assert.equal(
  filteredDock.shadow_actions.some((item) => item.anchorId === "ec-archived"),
  false,
  "archived events must not appear in dock"
);
assert.equal(
  filteredDock.shadow_actions.some((item) => item.anchorId === "ec-candidate"),
  false,
  "candidate lifecycle must not render in dock"
);
assert.ok(
  filteredDock.shadow_actions.some((item) => item.anchorId === "ec-visible"),
  "mentioned lifecycle should surface in dock"
);
resetEventCandidatesForTests([]);

console.log("test-predictive-dock: ok");
