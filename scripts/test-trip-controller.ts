import assert from "node:assert/strict";
import { buildFlightStatusCard } from "../lib/trip-controller/build-flight-status-card";
import { buildTripDock } from "../lib/trip-controller/build-trip-dock";
import { evaluateTripStatus } from "../lib/trip-controller/evaluate-trip-status";
import { parseFlightInfoFromText } from "../lib/trip-controller/parse-flight-info";
import {
  handlePackingItemToggle,
  orchestrateTripInteraction,
} from "../lib/trip-controller/orchestrate-trip-interaction";
import {
  resetTripStoreForTests,
  upsertTripFromMessage,
  togglePackingItem,
} from "../lib/trip-controller/trip-store";

resetTripStoreForTests();

const referenceDate = "2026-06-03";
const departureIso = "2026-06-03T16:00:00.000Z";

const flight = parseFlightInfoFromText({
  text: "KE123 인천-도쿄 16:00 출발 게이트 24",
  referenceDate,
});
assert.ok(flight);
assert.equal(flight!.flightNumber, "KE123");
assert.equal(flight!.gate, "24");

const prep = evaluateTripStatus({
  departureIso,
  now: new Date("2026-06-01T10:00:00.000Z"),
});
assert.equal(prep.status, "PREPARING");

const transit = evaluateTripStatus({
  departureIso,
  now: new Date("2026-06-03T13:00:00.000Z"),
});
assert.equal(transit.status, "AIRPORT_TRANSIT");

const trip = upsertTripFromMessage({
  message: "내일 KE123 인천공항 도쿄 여행",
  referenceDate,
  targetTimeIso: departureIso,
  placeName: "인천공항",
})!;
assert.ok(trip.packing);

const cardPrep = buildFlightStatusCard({
  ...trip,
  status: "PREPARING",
  minutesUntilDeparture: 72 * 60 + 10,
  packingComplete: false,
  packingProgress: { done: 0, total: 5 },
});
assert.equal(cardPrep?.main_action.type, "REMINDER");

const cardDay = buildFlightStatusCard({
  ...trip,
  status: "BOARDING",
  minutesUntilDeparture: 45,
  packingComplete: false,
  packingProgress: { done: 2, total: 5 },
});
assert.equal(cardDay?.main_action.type, "TICKET_QR");

const packingResult = orchestrateTripInteraction({
  message: "rimvio://trip/packing",
  referenceDate,
});
assert.ok(packingResult?.packingChecklist);
assert.ok(packingResult!.packingChecklist!.list.length >= 3);

const dockTransit = buildTripDock({
  ...trip,
  status: "AIRPORT_TRANSIT",
  minutesUntilDeparture: 180,
  packingComplete: false,
  packingProgress: { done: 4, total: 6 },
});
assert.equal(dockTransit.main_action?.type, "NAVIGATE");

const itemId = trip.packing!.items[0]!.id;
for (const item of trip.packing!.items) {
  togglePackingItem({ tripId: trip.id, itemId: item.id });
}
const passportToggle = handlePackingItemToggle({
  tripId: trip.id,
  itemId: trip.packing!.items.find((i) => i.item === "여권")?.id ?? itemId,
});
assert.ok(passportToggle?.summary.includes("여권") || passportToggle?.summary.includes("택시"));

const dockPacked = buildTripDock({
  ...trip,
  status: "AIRPORT_TRANSIT",
  minutesUntilDeparture: 180,
  packingComplete: true,
  packingProgress: { done: 6, total: 6 },
});
assert.equal(dockPacked.main_action?.label, "택시 호출");

console.log("test-trip-controller: ok");
