import assert from "node:assert/strict";
import {
  computePredictiveDock,
  visibleDockActions,
} from "../lib/predictive-dock/compute-predictive-dock";
import {
  finalizeActionOpportunities,
  visibleActionOpportunities,
} from "../lib/predictive-dock/compose-action-opportunities";
import { opportunitiesFromPlaceDiscovery } from "../lib/predictive-dock/opportunity-from-place-discovery";
import { resolveConversationIntent } from "../lib/predictive-dock/resolve-conversation-intent";
import { scoreActionOpportunity } from "../lib/predictive-dock/score-action-opportunity";
import { MAX_ACTION_OPPORTUNITIES } from "../lib/predictive-dock/action-opportunity-types";
import { resetTripStoreForTests } from "../lib/trip-controller/trip-store";
import type { TripRecord } from "../lib/trip-controller/types";
import type { PredictiveDockAction } from "../lib/predictive-dock/types";

const referenceDate = "2026-05-31";

function at(hour: number, minute = 0) {
  return new Date(
    `${referenceDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`
  );
}

const diningDiscovery = {
  action: "SHOW_CAFE_CARDS" as const,
  summary: "대전 치킨 맛집",
  options: [
    {
      name: "테라스키친",
      address: "대전 유성구",
      action_buttons: [{ label: "전화", href: "tel:042-000-0000" }],
      photo_urls: [],
    },
  ],
};

const diningMessages = [
  { id: "u1", role: "user" as const, text: "대전 치킨 맛집 추천", createdAt: "2026-05-31T10:00:00" },
  {
    id: "a1",
    role: "assistant" as const,
    text: "추천해 드릴게요.",
    createdAt: "2026-05-31T10:00:05",
    cafeDiscovery: diningDiscovery,
  },
];

assert.equal(
  resolveConversationIntent({
    lastUserMessage: "대전 치킨 맛집 추천",
    messages: diningMessages,
  }),
  "dining_discovery"
);

const diningItems = opportunitiesFromPlaceDiscovery(diningDiscovery);
assert.ok(diningItems.some((item) => item.label === "지도"));
assert.ok(diningItems.some((item) => item.label === "저장"));
assert.ok(diningItems.some((item) => item.label === "전화"));

const diningDock = computePredictiveDock({
  messages: diningMessages,
  schedule: [],
  referenceDate,
  now: at(10, 0),
  lastUserMessage: "대전 치킨 맛집 추천",
});

const diningVisible = visibleDockActions(diningDock);
assert.ok(diningVisible.length <= MAX_ACTION_OPPORTUNITIES);
assert.ok(diningVisible.some((item) => item.label === "지도"));
assert.equal(
  diningVisible.some((item) => item.label === "체크인"),
  false,
  "dining must not surface travel opportunities"
);

const tripFixture: TripRecord = {
  id: "trip-opp-test",
  title: "도쿄 여행",
  destination: "도쿄",
  departureIso: `${referenceDate}T18:00:00`,
  airportLabel: "인천공항",
  status: "DEPARTURE_24H",
  flight: null,
  packing: {
    tripId: "trip-opp-test",
    templateId: "AIRPORT_TRAVEL_01",
    destinationLabel: "도쿄",
    items: [{ id: "p1", item: "여권", checked: false }],
    updatedAt: `${referenceDate}T08:00:00`,
  },
  createdAt: `${referenceDate}T08:00:00`,
  updatedAt: `${referenceDate}T08:00:00`,
};

resetTripStoreForTests([tripFixture]);

const staleTripDuringDining = computePredictiveDock({
  messages: diningMessages,
  schedule: [],
  referenceDate,
  now: at(10, 0),
  lastUserMessage: "대전 치킨 맛집 추천",
});
assert.equal(
  visibleDockActions(staleTripDuringDining).some((item) => item.label === "체크인"),
  false
);

const travelDock = computePredictiveDock({
  messages: [
    {
      id: "u-travel",
      role: "user",
      text: "인천공항 택시 불러줘",
      createdAt: `${referenceDate}T09:50:00`,
    },
  ],
  schedule: [],
  referenceDate,
  now: at(10, 0),
  lastUserMessage: "인천공항 택시 불러줘",
});
assert.ok(
  visibleDockActions(travelDock).some((item) => item.label === "택시 호출"),
  "travel context should surface trip opportunities"
);

resetTripStoreForTests([]);

const navAction: PredictiveDockAction = {
  id: "test:nav",
  type: "NAVIGATE",
  label: "길찾기",
  icon: "📍",
  score: 92,
  state: "ACTIVE",
  prompt: "길찾기",
  intentDomain: "dining_discovery",
};

const airportAction: PredictiveDockAction = {
  id: "test:airport",
  type: "TAXI",
  label: "공항 이동",
  icon: "✈️",
  score: 90,
  state: "WARM",
  prompt: "공항 택시",
  intentDomain: "travel",
};

const diningFinalized = finalizeActionOpportunities({
  wire: { main_action: navAction, shadow_actions: [airportAction] },
  intent: "dining_discovery",
  minutesUntilAnchor: null,
});
assert.equal(
  visibleActionOpportunities(diningFinalized).some((item) => item.label === "공항 이동"),
  false,
  "unrelated travel opportunity must be hidden during dining"
);

const consumedFinalized = finalizeActionOpportunities({
  wire: { main_action: navAction, shadow_actions: [] },
  intent: "dining_discovery",
  consumedOpportunityIds: [navAction.id],
  minutesUntilAnchor: null,
});
assert.equal(visibleActionOpportunities(consumedFinalized).length, 0);

const breakdown = scoreActionOpportunity({
  action: navAction,
  intent: "dining_discovery",
  minutesUntilAnchor: 20,
});
assert.ok(breakdown.composite >= 0.42);

console.log("test-action-opportunity: ok");
