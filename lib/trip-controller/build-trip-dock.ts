import type { TripEvaluated } from "@/lib/trip-controller/types";
import type {
  PredictiveDockAction,
  PredictiveDockWire,
  PredictiveActionType,
} from "@/lib/predictive-dock/types";

const ICON: Record<PredictiveActionType, string> = {
  NAVIGATE: "🧭",
  CALL: "📞",
  INFO: "ℹ️",
  TRANSIT: "🚇",
  TAXI: "🚕",
  ZOOM: "📹",
  PARKING: "🅿️",
  EXPENSE: "🧾",
  NEXT: "📅",
  REST: "☕",
  SAVE: "💾",
  CHECK: "✅",
  LIST: "📋",
  SHARE: "📍",
  TICKET_QR: "🎫",
  LINK: "🔗",
};

function chip(
  input: Omit<PredictiveDockAction, "icon"> & {
    type: PredictiveActionType;
    tripAction?: PredictiveDockAction["tripAction"];
  }
): PredictiveDockAction {
  return { ...input, icon: ICON[input.type] ?? "✈️" };
}

/** Trip Controller → lifecycle-aware dock (replaces generic airport chips when trip exists). */
export function buildTripDock(trip: TripEvaluated): PredictiveDockWire {
  const airport = trip.airportLabel;
  const promoteTaxi =
    trip.status === "AIRPORT_TRANSIT" &&
    (trip.packingComplete || trip.packingProgress.done >= trip.packingProgress.total - 1);

  const packingChip = chip({
    id: `${trip.id}:packing`,
    type: "LIST",
    label: "짐 체크리스트",
    score: 82,
    state: "WARM",
    prompt: "rimvio://trip/packing",
    tripAction: "packing",
    templateId: "AIRPORT_TRAVEL_01",
    strategyApplied: "MANUAL_CORE",
  });

  const ticketChip = chip({
    id: `${trip.id}:ticket`,
    type: "TICKET_QR",
    label: "탑승권",
    score: 86,
    state: "WARM",
    prompt: "rimvio://trip/flight",
    tripAction: "flight",
  });

  const taxiChip = chip({
    id: `${trip.id}:taxi`,
    type: "TAXI",
    label: "택시 호출",
    score: promoteTaxi ? 99 : 88,
    state: promoteTaxi ? "ACTIVE" : "WARM",
    prompt: "rimvio://trip/taxi",
    tripAction: "taxi",
  });

  const navChip = chip({
    id: `${trip.id}:nav`,
    type: "NAVIGATE",
    label: "네비",
    score: 90,
    state: "WARM",
    prompt: `${airport} 길찾기`,
  });

  const checkinChip = chip({
    id: `${trip.id}:checkin`,
    type: "CHECK",
    label: "체크인",
    score: 84,
    state: "WARM",
    prompt: "rimvio://trip/flight",
    tripAction: "flight",
  });

  switch (trip.status) {
    case "PREPARING": {
      const pool = [checkinChip, packingChip, ticketChip];
      return pickMain(pool, null);
    }
    case "DEPARTURE_24H": {
      const pool = [checkinChip, packingChip, taxiChip];
      return pickMain(pool, checkinChip);
    }
    case "AIRPORT_TRANSIT": {
      const main = promoteTaxi ? taxiChip : navChip;
      const pool = [main, ticketChip, packingChip];
      return pickMain(pool, main);
    }
    case "BOARDING": {
      const boarding = chip({
        id: `${trip.id}:boarding`,
        type: "TICKET_QR",
        label: "탑승권 보기",
        score: 99,
        state: "ACTIVE",
        prompt: "rimvio://trip/flight",
        tripAction: "flight",
      });
      const gate = chip({
        id: `${trip.id}:gate`,
        type: "INFO",
        label: "게이트 확인",
        score: 92,
        state: "WARM",
        prompt: trip.flight?.gate
          ? `${trip.flight.flightNumber} 게이트 ${trip.flight.gate} 확인`
          : "게이트 확인해줘",
      });
      return pickMain([boarding, gate, packingChip], boarding);
    }
    default:
      return { main_action: null, shadow_actions: [] };
  }
}

function pickMain(
  pool: PredictiveDockAction[],
  preferredMain: PredictiveDockAction | null
): PredictiveDockWire {
  const ranked = [...pool].sort((left, right) => right.score - left.score);
  const main_action =
    preferredMain ??
    ranked.find((item) => item.state === "ACTIVE" && item.score >= 80) ??
    ranked[0] ??
    null;
  const shadow_actions = ranked
    .filter((item) => item.id !== main_action?.id)
    .slice(0, 4);
  return { main_action, shadow_actions };
}
