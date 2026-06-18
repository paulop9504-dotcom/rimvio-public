import type { ActionEventEvaluated } from "@/lib/action-event-registry/types";
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
  input: Omit<PredictiveDockAction, "icon"> & { type: PredictiveActionType }
): PredictiveDockAction {
  return { ...input, icon: ICON[input.type] };
}

function warmDockForEvent(event: ActionEventEvaluated): PredictiveDockAction[] {
  const place = event.placeName ?? event.task;

  if (event.kind === "airport_travel") {
    if (event.minutesUntil > 240) {
      return [
        chip({
          id: `${event.id}:save`,
          type: "INFO",
          label: "일정 확정",
          score: 100,
          state: "ACTIVE",
          prompt: `${place} 일정 확인해줘`,
        }),
        chip({
          id: `${event.id}:ticket`,
          type: "INFO",
          label: "항공권",
          score: 85,
          state: "WARM",
          prompt: `${place} 항공권 확인해줘`,
        }),
        chip({
          id: `${event.id}:pack`,
          type: "INFO",
          label: "짐 체크",
          score: 70,
          state: "WARM",
          prompt: `${place} 짐 체크리스트 만들어줘`,
        }),
      ];
    }

    if (event.minutesUntil > 180) {
      return [
        chip({
          id: `${event.id}:checkin`,
          type: "INFO",
          label: "체크인",
          score: 88,
          state: "WARM",
          prompt: `${place} 체크인 시작해줘`,
        }),
        chip({
          id: `${event.id}:transit-warm`,
          type: "TRANSIT",
          label: "교통",
          score: 82,
          state: "WARM",
          prompt: `${place} 가는 교통 알려줘`,
        }),
      ];
    }
  }

  return [
    chip({
      id: `${event.id}:info`,
      type: "INFO",
      label: "정보",
      score: 72,
      state: "WARM",
      prompt: `${place} 정보 알려줘`,
    }),
    chip({
      id: `${event.id}:call-warm`,
      type: "CALL",
      label: "전화",
      score: 65,
      state: "WARM",
      prompt: event.phone ? `tel:${event.phone}` : `${place} 전화`,
    }),
  ];
}

function activeDockForEvent(event: ActionEventEvaluated): PredictiveDockAction[] {
  const place = event.placeName ?? event.task;

  if (event.kind === "airport_travel") {
    if (event.minutesUntil <= 60) {
      return [
        chip({
          id: `${event.id}:gate`,
          type: "INFO",
          label: "게이트",
          score: 96,
          state: "ACTIVE",
          prompt: `${place} 게이트 확인해줘`,
        }),
        chip({
          id: `${event.id}:boarding`,
          type: "INFO",
          label: "탑승권",
          score: 88,
          state: "WARM",
          prompt: "탑승권 보여줘",
        }),
      ];
    }

    return [
      chip({
        id: `${event.id}:ride`,
        type: "TAXI",
        label: "교통 예약",
        score: 99,
        state: "ACTIVE",
        prompt: `${place} 가는 택시/공항철도 예약해줘`,
      }),
      chip({
        id: `${event.id}:nav`,
        type: "NAVIGATE",
        label: "네비",
        score: 90,
        state: "WARM",
        prompt: `${place} 길찾기`,
      }),
      chip({
        id: `${event.id}:checkin-active`,
        type: "INFO",
        label: "체크인",
        score: 80,
        state: "WARM",
        prompt: "체크인 상태 확인해줘",
      }),
    ];
  }

  if (event.minutesUntil <= 5) {
    return [
      chip({
        id: `${event.id}:nav-now`,
        type: "NAVIGATE",
        label: "네비",
        score: 98,
        state: "ACTIVE",
        prompt: `${place} 길찾기 시작해줘`,
      }),
    ];
  }

  return [
    chip({
      id: `${event.id}:nav-active`,
      type: "NAVIGATE",
      label: "길찾기",
      score: 94,
      state: "ACTIVE",
      prompt: `${place} 길찾기`,
    }),
    chip({
      id: `${event.id}:call-active`,
      type: "CALL",
      label: "전화",
      score: 78,
      state: "WARM",
      prompt: event.phone ? `tel:${event.phone}` : `${place} 전화`,
    }),
    chip({
      id: `${event.id}:transit-active`,
      type: "TRANSIT",
      label: "교통",
      score: 74,
      state: "WARM",
      prompt: `${place} 가는 교통 알려줘`,
    }),
  ];
}

/** Build dock wire from evaluated registry events (lifecycle-aware). */
export function buildDockFromActionEvents(events: ActionEventEvaluated[]): PredictiveDockWire {
  if (events.length === 0) {
    return { main_action: null, shadow_actions: [] };
  }

  const primary = events[0]!;
  const pool =
    primary.lifecycle === "ACTIVE"
      ? activeDockForEvent(primary)
      : warmDockForEvent(primary);

  const ranked = pool.sort((left, right) => right.score - left.score);
  const main_action =
    ranked.find((item) => item.state === "ACTIVE" && item.score >= 80) ?? null;
  const shadow_actions = ranked
    .filter((item) => item.id !== main_action?.id && item.state === "WARM")
    .slice(0, 4);

  return { main_action, shadow_actions };
}
