import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";

import { getTemplateInstance } from "@/lib/action-template/template-instance-store";

import { instanceToDockWire } from "@/lib/action-template/run-template-merge-pipeline";

import { getActiveTrip } from "@/lib/trip-controller/trip-store";

import { buildTripDock } from "@/lib/trip-controller/build-trip-dock";

import type { TripEvaluated } from "@/lib/trip-controller/types";

import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";

import {

  architectWireToDockWire,

  buildArchitectWireFromTemplate,

  matchActionTemplate,

} from "@/lib/action-registry/match-template";

import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { finalizeActionOpportunities, visibleActionOpportunities } from "@/lib/predictive-dock/compose-action-opportunities";

import {

  collectEventCandidateAnchors,

  nearestEventCandidateAnchorMinutes,

} from "@/lib/predictive-dock/collect-event-candidate-anchors";

import { attachEventAnchorIds } from "@/lib/predictive-dock/attach-event-anchor-ids";

import { normalizeAnchorId } from "@/lib/events/normalize-anchor-id";

import { opportunitiesFromPlaceDiscovery } from "@/lib/predictive-dock/opportunity-from-place-discovery";

import { resolveConversationIntent } from "@/lib/predictive-dock/resolve-conversation-intent";

import type { CanonicalContainerKey } from "@/lib/containers/container-types";

import type {

  PredictiveActionType,

  PredictiveDockAction,

  PredictiveDockWire,

  ScheduleAnchor,

  ShadowActionState,

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



const TRAVEL_CONTEXT =

  /(?:공항|airport|항공|인천|김포|여행|trip|탑승|체크인|비행|출장|탑승권|boarding|flight|짐\s*체크|패킹)/iu;



const NON_TRAVEL_DOCK_INTENT =

  /(?:맛집|식당|치킨|카페|놀\s*만|디저트|영수증|일정\s*정리|미팅\s*잡)/iu;



function shouldSuppressDockForCurrentIntent(

  lastUserMessage: string | null | undefined

): boolean {

  const trimmed = lastUserMessage?.trim();

  if (!trimmed) {

    return false;

  }

  if (isPlaceRecommendationQuery(trimmed)) {

    return true;

  }

  return (

    NON_TRAVEL_DOCK_INTENT.test(trimmed) &&

    /(?:추천|찾|알려|골라|해\s*줘)/u.test(trimmed)

  );

}



function hasRecentTravelContext(input: {

  messages: ActionChatMessage[];

  lastUserMessage?: string | null;

}): boolean {

  if (input.lastUserMessage && TRAVEL_CONTEXT.test(input.lastUserMessage)) {

    return true;

  }



  let userTurns = 0;

  for (let index = input.messages.length - 1; index >= 0; index -= 1) {

    const message = input.messages[index];

    if (message?.role !== "user") {

      continue;

    }

    userTurns += 1;

    if (TRAVEL_CONTEXT.test(message.text)) {

      return true;

    }

    if (userTurns >= 5) {

      break;

    }

  }



  return false;

}



/** Trip chips above composer — only when travel is the active thread. */

export function shouldSurfaceTripDock(

  trip: TripEvaluated,

  input: {

    messages: ActionChatMessage[];

    lastUserMessage?: string | null;

  }

): boolean {

  if (shouldSuppressDockForCurrentIntent(input.lastUserMessage)) {

    return false;

  }



  if (trip.status === "AIRPORT_TRANSIT" || trip.status === "BOARDING") {

    return true;

  }



  return hasRecentTravelContext(input);

}



function minutesUntil(fireAt: string, nowMs: number): number | null {

  const target = parseActionTargetDatetime(fireAt);

  if (!target) {

    return null;

  }

  return Math.round((target.getTime() - nowMs) / 60_000);

}



function action(

  input: Omit<PredictiveDockAction, "icon"> & { type: PredictiveActionType }

): PredictiveDockAction {

  return { ...input, icon: ICON[input.type] };

}



function ecAnchorId(anchor: ScheduleAnchor): string | undefined {
  return normalizeAnchorId(anchor.id) ?? undefined;
}



function shadowsForAnchor(anchor: ScheduleAnchor, minutes: number): PredictiveDockAction[] {

  const place = anchor.placeName;

  const items: PredictiveDockAction[] = [];

  const anchorId = ecAnchorId(anchor);



  if (minutes < -45) {

    return [];

  }



  if (minutes < 0) {

    items.push(

      action({

        id: `${anchor.id}:expense`,

        type: "EXPENSE",

        label: "비용",

        score: 55,

        state: "WARM",

        prompt: `${place} 비용 기록해줘`,

        anchorId,

      }),

      action({

        id: `${anchor.id}:next`,

        type: "NEXT",

        label: "다음",

        score: 50,

        state: "WARM",

        prompt: "다음 일정 알려줘",

        anchorId,

      })

    );

    return items;

  }



  if (minutes <= 5) {

    items.push(

      action({

        id: `${anchor.id}:nav-active`,

        type: "NAVIGATE",

        label: "네비",

        score: 98,

        state: "ACTIVE",

        prompt: `${place} 길찾기 시작해줘`,

        promote_when: { minutes_before: 5 },

        anchorId,

      })

    );

    return items;

  }



  if (minutes <= 20) {

    items.push(

      action({

        id: `${anchor.id}:nav`,

        type: "NAVIGATE",

        label: "길찾기",

        score: 92,

        state: "ACTIVE",

        prompt: `${place} 길찾기`,

        promote_when: { minutes_before: 30 },

        anchorId,

      }),

      action({

        id: `${anchor.id}:call`,

        type: "CALL",

        label: "전화",

        score: 72,

        state: "WARM",

        prompt: anchor.phone ? `tel:${anchor.phone}` : `${place} 전화번호 찾아줘`,

        anchorId,

      })

    );

    return items;

  }



  if (minutes <= 60) {

    items.push(

      action({

        id: `${anchor.id}:nav-warm`,

        type: "NAVIGATE",

        label: "길찾기",

        score: 78,

        state: "WARM",

        prompt: `${place} 길찾기`,

        promote_when: { minutes_before: 30 },

        anchorId,

      }),

      action({

        id: `${anchor.id}:transit`,

        type: "TRANSIT",

        label: "교통",

        score: 74,

        state: "WARM",

        prompt: `${place} 가는 교통 알려줘`,

        anchorId,

      }),

      action({

        id: `${anchor.id}:call-warm`,

        type: "CALL",

        label: "전화",

        score: 68,

        state: "WARM",

        prompt: `${place} 전화`,

        anchorId,

      })

    );

    return items;

  }



  items.push(

    action({

      id: `${anchor.id}:info`,

      type: "INFO",

      label: "정보",

      score: 62,

      state: "WARM",

      prompt: `${place} 정보 알려줘`,

      anchorId,

    }),

    action({

      id: `${anchor.id}:call-far`,

      type: "CALL",

      label: "전화",

      score: 58,

      state: "WARM",

      prompt: `${place} 전화`,

      anchorId,

    })

  );



  if (/미팅|회의|zoom|Zoom|화상/u.test(anchor.task)) {

    items.push(

      action({

        id: `${anchor.id}:zoom`,

        type: "ZOOM",

        label: "Zoom",

        score: 70,

        state: "WARM",

        prompt: `${anchor.task} 화상 링크 열어줘`,

        anchorId,

      })

    );

  }



  return items;

}



function boostFromMessage(

  items: PredictiveDockAction[],

  lastUserMessage: string | null | undefined

): PredictiveDockAction[] {

  if (!lastUserMessage?.trim()) {

    return items;

  }



  const text = lastUserMessage.trim();

  return items.map((item) => {

    let bonus = 0;

    if (item.type === "CALL" && /전화|연락|전화줌|콜/u.test(text)) {

      bonus = 18;

    }

    if (item.type === "NAVIGATE" && /나가|출발|길|네비|이동/u.test(text)) {

      bonus = 16;

    }

    if (item.type === "TRANSIT" && /교통|지하철|버스|택시/u.test(text)) {

      bonus = 12;

    }

    return bonus > 0 ? { ...item, score: Math.min(99, item.score + bonus) } : item;

  });

}



function pickMainAndShadows(items: PredictiveDockAction[]): PredictiveDockWire {

  const ranked = [...items].sort((left, right) => right.score - left.score);

  const activeCandidates = ranked.filter(

    (item) => item.state === "ACTIVE" && item.score >= 80

  );

  const main_action = activeCandidates[0] ?? null;



  const shadow_actions = ranked

    .filter((item) => item.state === "WARM" && item.id !== main_action?.id)

    .slice(0, 4);



  return { main_action, shadow_actions };

}



function latestCafeDiscovery(

  messages: ActionChatMessage[]

): import("@/lib/context-resolver/places/types").CafeDiscoveryWire | null {

  for (let index = messages.length - 1; index >= 0; index -= 1) {

    const message = messages[index];

    if (message?.role === "assistant" && message.cafeDiscovery?.options.length) {

      return message.cafeDiscovery;

    }

  }

  return null;

}



function buildRawPredictiveDock(input: {

  messages: ActionChatMessage[];

  referenceDate: string;

  now?: Date;

  lastUserMessage?: string | null;

}): PredictiveDockWire {

  const nowMs = input.now?.getTime() ?? Date.now();



  const activeTrip = getActiveTrip(input.now);

  if (activeTrip && shouldSurfaceTripDock(activeTrip, input)) {

    const tripDock = buildTripDock(activeTrip);

    if (activeTrip.templateInstanceId) {

      const instance = getTemplateInstance(activeTrip.templateInstanceId);

      if (instance) {

        const instanceDock = instanceToDockWire(instance);

        const main_action = tripDock.main_action ?? instanceDock.main_action;

        const seen = new Set<string>();

        const shadow_actions = [...tripDock.shadow_actions, ...instanceDock.shadow_actions]

          .filter((item) => {

            const key = `${item.type}:${item.label}`;

            if (seen.has(key) || item.id === main_action?.id) {

              return false;

            }

            seen.add(key);

            return true;

          })

          .slice(0, 4);

        if (main_action || shadow_actions.length > 0) {

          return { main_action, shadow_actions };

        }

      }

    }

    if (tripDock.main_action || tripDock.shadow_actions.length > 0) {

      return tripDock;

    }

  }



  const anchors = collectEventCandidateAnchors();



  if (input.lastUserMessage?.trim()) {

    const nearest = anchors[0];

    const minutes = nearest ? minutesUntil(nearest.fireAt, nowMs) : null;



    const templateMatch = matchActionTemplate({

      message: input.lastUserMessage,

      placeName: nearest?.placeName,

      task: nearest?.task,

      minutesUntil: minutes,

    });

    if (templateMatch) {

      const architectWire = buildArchitectWireFromTemplate(

        templateMatch,

        input.lastUserMessage,

        minutes

      );

      return attachEventAnchorIds(

        architectWireToDockWire(architectWire),

        nearest?.id ?? null

      );

    }

  }



  let pool: PredictiveDockAction[] = [];



  for (const anchor of anchors) {

    const minutes = minutesUntil(anchor.fireAt, nowMs);

    if (minutes == null) {

      continue;

    }

    if (minutes > 24 * 60) {

      continue;

    }

    pool.push(...shadowsForAnchor(anchor, minutes));

  }



  pool = boostFromMessage(pool, input.lastUserMessage);



  if (pool.length === 0 && input.lastUserMessage) {

    const text = input.lastUserMessage.trim();

    if (/전화|연락/u.test(text)) {

      pool.push(

        action({

          id: "conv:call",

          type: "CALL",

          label: "전화",

          score: 75,

          state: "WARM",

          prompt: "방금 말한 대상에게 전화 연결해줘",

        })

      );

    }

    if (/나가|출발|길/u.test(text)) {

      pool.push(

        action({

          id: "conv:nav",

          type: "NAVIGATE",

          label: "길찾기",

          score: 82,

          state: "ACTIVE",

          prompt: "길찾기 실행해줘",

        })

      );

    }

  }



  return pickMainAndShadows(pool);

}



/** Pure projection → Action Opportunity wire (score · filter · cap 3). */

export function computePredictiveDock(input: {

  messages: ActionChatMessage[];

  referenceDate: string;

  now?: Date;

  lastUserMessage?: string | null;

  activeChains?: readonly CanonicalContainerKey[];

  consumedOpportunityIds?: readonly string[];

  /** @deprecated ignored — dock reads EventCandidate store only */

  schedule?: unknown;

}): PredictiveDockWire {

  const nowMs = input.now?.getTime() ?? Date.now();

  const intent = resolveConversationIntent({

    lastUserMessage: input.lastUserMessage,

    messages: input.messages,

    activeChains: input.activeChains,

  });



  let raw = buildRawPredictiveDock(input);



  if (intent === "dining_discovery") {

    const discovery = latestCafeDiscovery(input.messages);

    if (discovery) {

      const diningItems = opportunitiesFromPlaceDiscovery(discovery);

      raw = pickMainAndShadows(diningItems);

    } else if (isPlaceRecommendationQuery(input.lastUserMessage?.trim() ?? "")) {

      raw = { main_action: null, shadow_actions: [] };

    }

  }



  const mention = input.lastUserMessage
    ? parseActionMention(input.lastUserMessage)
    : null;

  return finalizeActionOpportunities({

    wire: raw,

    intent,

    activeChains: input.activeChains,

    consumedOpportunityIds: input.consumedOpportunityIds,

    minutesUntilAnchor: nearestEventCandidateAnchorMinutes(nowMs),

    ranking_context_key: mention?.contextKey,

  });

}



export function visibleDockActions(wire: PredictiveDockWire): PredictiveDockAction[] {

  return visibleActionOpportunities(wire);

}


