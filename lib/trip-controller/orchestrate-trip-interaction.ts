import { buildFlightStatusCard } from "@/lib/trip-controller/build-flight-status-card";
import {
  ensurePackingList,
  getActiveTrip,
  getTripById,
  togglePackingItem,
} from "@/lib/trip-controller/trip-store";
import type {
  FlightStatusCardWire,
  PackingChecklistWire,
} from "@/lib/trip-controller/types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { PresentationWire } from "@/lib/presentation/presentation-mode";

const PACKING_RE = /(?:짐\s*체크|체크리스트|packing)/iu;
const FLIGHT_RE = /(?:항공권|탑승권|체크인|boarding|flight)/iu;
const TRIP_URI = /^rimvio:\/\/trip\/(packing|flight|taxi)$/i;

export function isTripControllerMessage(message: string): boolean {
  const trimmed = message.trim();
  return TRIP_URI.test(trimmed) || PACKING_RE.test(trimmed) || FLIGHT_RE.test(trimmed);
}

function buildPackingWire(tripId: string): PackingChecklistWire | null {
  const packing = ensurePackingList(tripId);
  const trip = getActiveTrip();
  if (!packing || !trip) {
    return null;
  }
  return {
    tripId,
    destinationLabel: packing.destinationLabel,
    list: packing.items.map((item) => ({
      id: item.id,
      item: item.item,
      checked: item.checked,
    })),
  };
}

export function orchestrateTripInteraction(input: {
  message: string;
  referenceDate?: string;
}): OrchestratorResult | null {
  const trimmed = input.message.trim();
  const trip = getActiveTrip();
  if (!trip) {
    return null;
  }

  const uriMatch = trimmed.match(TRIP_URI);
  const intent = uriMatch?.[1]?.toLowerCase() ?? null;

  if (intent === "packing" || PACKING_RE.test(trimmed)) {
    const wire = buildPackingWire(trip.id);
    if (!wire) {
      return null;
    }
    return {
      summary: `${trip.destination} 여행 짐 체크리스트예요. 챙긴 항목을 눌러 주세요.`,
      actions: [],
      source: "rules",
      confidence: 0.95,
      disclosure: "high",
      actionsRevealed: false,
      pendingConfirm: false,
      packingChecklist: wire,
      presentation: { mode: "PACKING_CHECKLIST" } satisfies PresentationWire,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    };
  }

  if (intent === "flight" || FLIGHT_RE.test(trimmed)) {
    const card = buildFlightStatusCard(trip);
    if (!card) {
      return {
        summary: "항공권 정보를 아직 못 찾았어요. 항공편 번호나 예약 문자를 붙여 주세요.",
        actions: [],
        source: "rules",
        confidence: 0.8,
        disclosure: "medium",
        actionsRevealed: false,
        pendingConfirm: false,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      };
    }
    return {
      summary: `${card.card.title} · ${card.card.status}`,
      actions: [],
      source: "rules",
      confidence: 0.95,
      disclosure: "high",
      actionsRevealed: false,
      pendingConfirm: false,
      flightStatusCard: card,
      presentation: { mode: "FLIGHT_CARD" } satisfies PresentationWire,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    };
  }

  if (intent === "taxi") {
    const label = trip.packingComplete ? "택시" : "공항";
    return {
      summary: trip.packingComplete
        ? "짐 싸기 완료! 이제 택시 부를까요?"
        : `${trip.airportLabel} 가는 택시를 예약할게요.`,
      actions: [
        {
          label: `${trip.airportLabel} 택시 호출`,
          icon: "taxi",
          action_type: "DEEP_LINK",
          url: `https://taxi.rimvio.local/?dest=${encodeURIComponent(trip.airportLabel)}`,
        },
      ],
      source: "rules",
      confidence: 0.92,
      disclosure: "high",
      actionsRevealed: true,
      pendingConfirm: false,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    };
  }

  return null;
}

export function handlePackingItemToggle(input: {
  tripId: string;
  itemId: string;
}): OrchestratorResult | null {
  const result = togglePackingItem(input);
  if (!result) {
    return null;
  }

  const { trip, toggledItem, justCompleted } = result;
  const wire: PackingChecklistWire = {
    tripId: trip.id,
    destinationLabel: trip.packing?.destinationLabel ?? trip.destination,
    list: (trip.packing?.items ?? []).map((item) => ({
      id: item.id,
      item: item.item,
      checked: item.checked,
    })),
    completionMessage: justCompleted ? "짐 싸기 완료! 이제 출발 준비하세요." : null,
    promoteTaxi: justCompleted && trip.status === "AIRPORT_TRANSIT",
  };

  const checkedLabel = wire.list.find((item) => item.id === input.itemId)?.checked
    ? `[v] ${toggledItem}`
    : `[ ] ${toggledItem}`;

  let summary = justCompleted
    ? "짐 싸기 완료! 이제 출발 준비하세요."
    : toggledItem === "여권" && wire.list.find((i) => i.item === "여권")?.checked
      ? "여권 챙기셨네요! 이제 택시 부를까요?"
      : `${checkedLabel} 반영했어요.`;

  if (wire.promoteTaxi && !justCompleted) {
    summary = "여권 챙기셨네요! 이제 택시 부를까요?";
  }

  return {
    summary,
    actions: wire.promoteTaxi || justCompleted
      ? [
          {
            label: `${trip.airportLabel} 택시 호출`,
            icon: "taxi",
            action_type: "DEEP_LINK",
            url: `rimvio://trip/taxi`,
          },
        ]
      : [],
    source: "rules",
    confidence: 0.95,
    disclosure: "high",
    actionsRevealed: Boolean(wire.promoteTaxi || justCompleted),
    pendingConfirm: false,
    packingChecklist: wire,
    presentation: { mode: "PACKING_CHECKLIST" } satisfies PresentationWire,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
  };
}

export function buildFlightCardForTrip(tripId: string): FlightStatusCardWire | null {
  const trip = getTripById(tripId);
  if (!trip) {
    return null;
  }
  const evaluated = getActiveTrip();
  if (!evaluated || evaluated.id !== tripId) {
    return null;
  }
  return buildFlightStatusCard(evaluated);
}
