import {

  buildGoogleMapsSearchHref,

  buildNaverMapSearchHref,

  buildNaverMapSearchWebHref,

} from "@/lib/resolvers/deep-links";
import { resolveSearchQuery } from "@/lib/search-intent/resolve-search-intent";

import {

  buildGoogleSearchHref,

  buildNaverBlogSearchHref,

  buildNaverShoppingSearchHref,

  buildNaverWebSearchHref,

} from "@/lib/actions/search-urls";

import { createOpenAction } from "@/lib/enrichers/action-factory";

import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";

import {
  estimateRuleOrchestratorConfidence,
  isUserConfirmingActions,
} from "@/lib/action-chat/action-confidence";
import { hasPendingEventReview } from "@/lib/event-kernel/review/infer-approval-action";
import { buildDomainActions } from "@/lib/actions/build-domain-actions";
import { resolveDomainKey } from "@/lib/actions/domain-context";
import { orchestrateTripInteraction } from "@/lib/trip-controller/orchestrate-trip-interaction";
import { interceptActionOsFromMessage } from "@/lib/action-os/intercept-action-os";
import { tryBatchConfirmPriority } from "@/lib/action-chat/batch-confirm-priority";
import { tryPlaceConfirmation } from "@/lib/action-chat/confirmation-logic";
import { buildEntityFacetResult } from "@/lib/context-resolver/discovery/orchestrate-entity-facet";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { isBareBrandUtterance } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { tryEntityArchitect } from "@/lib/action-chat/entity-action-architect";
import type { IntentRoute } from "@/lib/action-chat/intent-router";

import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";

import {

  buildRuleScheduleBlock,

  normalizeMasterOrchestratorWire,

} from "@/lib/action-chat/normalize-master-result";

import type { MasterOrchestratorWire, OrchestratorResult, OrchestratorScheduleWire } from "@/lib/action-chat/orchestrator-types";
import { EMPTY_SCHEDULE_WIRE } from "@/lib/action-chat/orchestrator-types";

import { parseScheduleTasksFromMessage } from "@/lib/schedule/day-schedule";
import { orchestrateTransportLive } from "@/lib/action-chat/orchestrate-transport-live";
import { orchestrateUserDefinedAction } from "@/lib/action-chat/orchestrate-user-defined-action";
import { tryDeepLinkDispatchOrchestration } from "@/lib/deep-link-dispatch/orchestrate-deep-link-dispatch";
import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import { orchestrateShadowDashboard } from "@/lib/notification-shadow/orchestrate-shadow-dashboard";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";



function trimSummary(text: string) {

  return text.replace(/\s+/g, " ").trim().slice(0, 15);

}



function detectContainerHint(input: {

  message: string;

  context?: MasterOrchestratorContext;

}) {

  const lower = input.message.toLowerCase();

  const travel = /여행|trip|제주|오사카|일정|출장/.test(input.message);

  const work = /프로젝트|업무|회의|project/.test(lower);

  const study = /시험|공부|study|과제/.test(lower);



  if (!travel && !work && !study) {

    return null;

  }



  const topic = travel ? "travel" : work ? "work" : "study";

  const title = travel ? "여행" : work ? "업무" : "공부";

  const existing = input.context?.activeContainers.find((item) => item.topic === topic);



  return {

    action: existing ? ("UPDATE" as const) : ("CREATE" as const),

    title: existing?.title ?? title,

    should_save: true,

  };

}



export function orchestrateByRules(input: {

  message: string;

  history?: import("@/lib/action-chat/orchestrator-types").OrchestrateHistoryTurn[];

  linkTitle?: string | null;

  linkUrl?: string | null;

  masterContext?: MasterOrchestratorContext;

  intentRoute?: IntentRoute;

  userDefinedActions?: UserDefinedAction[];

}): OrchestratorResult {

  const message = input.message.trim();

  if (isUserConfirmingActions(message) && !hasPendingEventReview()) {
    return {
      summary: "네, 알겠어요. 확인 카드가 있다면 **네, 맞습니다**를 눌러 주세요.",
      actions: [],
      source: "rules",
      confidence: 1,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: false,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    };
  }

  const lower = message.toLowerCase();
  const contextSwitch = input.intentRoute?.requires_context_switch ?? false;
  const effectiveLinkTitle = contextSwitch ? null : input.linkTitle;
  const effectiveLinkUrl = contextSwitch ? null : input.linkUrl;

  const userDefined = orchestrateUserDefinedAction({
    message,
    userDefinedActions: input.userDefinedActions,
  });
  if (userDefined) {
    return userDefined;
  }

  const deepLinkDispatch = tryDeepLinkDispatchOrchestration({ message });
  if (deepLinkDispatch) {
    return deepLinkDispatch;
  }

  const shadowDashboard = orchestrateShadowDashboard(message);
  if (shadowDashboard) {
    return shadowDashboard;
  }

  const aiIntent = orchestrateAiIntent(message);
  if (aiIntent) {
    return aiIntent;
  }

  const transportLive = orchestrateTransportLive({ message });
  if (transportLive) {
    return transportLive;
  }

  const tripInteraction = orchestrateTripInteraction({
    message,
    referenceDate: input.masterContext?.currentDate,
  });
  if (tripInteraction) {
    return tripInteraction;
  }

  const registerAction = interceptActionOsFromMessage(message);
  if (registerAction) {
    return registerAction;
  }

  const entityQuickPick = orchestrateEntityQuickPick(message);
  if (entityQuickPick) {
    return entityQuickPick;
  }

  const entityFacet = buildEntityFacetResult(message);
  if (entityFacet) {
    return entityFacet;
  }

  const batchConfirm = tryBatchConfirmPriority({
    message,
    referenceDate: input.masterContext?.currentDate,
    existingSchedule: input.masterContext?.existingSchedule ?? [],
  });
  if (batchConfirm) {
    return batchConfirm;
  }

  const placeConfirm = tryPlaceConfirmation({
    message,
    referenceDate: input.masterContext?.currentDate,
    history: input.history,
  });
  if (placeConfirm) {
    return placeConfirm;
  }

  const entityResult = tryEntityArchitect(message);
  if (entityResult && entityResult.actions.length > 0) {
    const wire: MasterOrchestratorWire = {
      summary: trimSummary(entityResult.wire.summary),
      confidence_score: estimateRuleOrchestratorConfidence({
        message,
        actionCount: entityResult.actions.length,
        hasExplicitUrl: Boolean(entityResult.wire.extracted_info.website),
      }),
      metadata: {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
      },
      actions: entityResult.wire.actions,
      schedule: { is_conflict: false, message: "", tasks: [] },
      container: { action: "NONE", title: "", should_save: false },
    };

    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.masterContext?.existingSchedule ?? [],
    });
  }

  const urls = extractExplicitUrls(message);

  const actions = [];



  if (urls.length > 0) {

    actions.push(

      createOpenAction({

        label: "🔗 링크 열기",

        href: urls[0]!,

        icon: "link",

        copyText: urls[0]!,

      })

    );

  }



  const placeQuery = resolveSearchQuery({
    text:
      message.replace(/https?:\/\/\S+/g, "").trim().slice(0, 120) ||
      effectiveLinkTitle?.trim() ||
      "",
    context: effectiveLinkTitle?.trim(),
  });



  if (/길찾|네비|navigation|navigate/i.test(message)) {

    actions.push(

      createOpenAction({

        label: "🚗 길찾기",

        href: buildGoogleMapsSearchHref(placeQuery),

        icon: "map",

        copyText: placeQuery,

        fallbackHref: buildNaverMapSearchWebHref(placeQuery),

      })

    );

  } else if (/지도|위치|맛집|식당|카페|어디|place|map/i.test(message)) {

    actions.push(

      createOpenAction({

        label: "📍 지도에서 보기",

        href: buildNaverMapSearchHref(placeQuery),

        icon: "map",

        copyText: placeQuery,

        fallbackHref: buildNaverMapSearchWebHref(placeQuery),

      })

    );

  }



  if (/최저|가격|쇼핑|구매|shopping|price/i.test(message)) {

    actions.push(

      createOpenAction({

        label: "🛒 쇼핑 검색",

        href: buildNaverShoppingSearchHref(placeQuery),

        icon: "link",

        copyText: placeQuery,

      })

    );

  }



  if (/리뷰|후기|review|blog/i.test(message)) {

    actions.push(

      createOpenAction({

        label: "⭐ 리뷰 검색",

        href: buildNaverBlogSearchHref(placeQuery),

        icon: "link",

        copyText: placeQuery,

      })

    );

  }



  if (/검색|search|찾아/i.test(message) && actions.length === 0) {

    actions.push(

      createOpenAction({

        label: "🔎 웹 검색",

        href: buildNaverWebSearchHref(placeQuery),

        icon: "link",

        copyText: placeQuery,

      })

    );

  }



  if (actions.length === 0 && !isBareBrandUtterance(message)) {

    actions.push(

      createOpenAction({

        label: "🔎 검색하기",

        href: buildGoogleSearchHref(placeQuery),

        icon: "link",

        copyText: placeQuery,

      })

    );



    if (effectiveLinkUrl?.startsWith("http")) {

      actions.push(

        createOpenAction({

          label: "🔗 링크 열기",

          href: effectiveLinkUrl,

          icon: "link",

          copyText: effectiveLinkUrl,

        })

      );

    }

  }



  const domain = resolveDomainKey({
    message: contextSwitch ? message : `${message} ${effectiveLinkTitle ?? ""}`,
  });
  const domainQuery =
    effectiveLinkTitle?.trim() ||
    message.replace(/https?:\/\/\S+/g, "").trim().slice(0, 80);

  const domainActions =
    domain !== "generic"
      ? buildDomainActions({
          domain,
          query: domainQuery,
          linkUrl: effectiveLinkUrl ?? undefined,
        })
      : [];

  if (domainActions.length >= 2) {
    const wire: MasterOrchestratorWire = {
      summary:
        domain === "dining"
          ? trimSummary(`${domainQuery.slice(0, 8)} 맛집`)
          : trimSummary(domainQuery.slice(0, 15) || "바로 실행"),
      confidence_score: estimateRuleOrchestratorConfidence({
        message,
        actionCount: domainActions.length,
        hasExplicitUrl: urls.length > 0,
      }),
      metadata: {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
      },
      actions: domainActions.map((action) => ({
        label: action.label,
        icon: String(action.payload?.icon ?? "link"),
        url: action.href ?? "",
      })),
      schedule: { is_conflict: false, message: "", tasks: [] },
      container: { action: "NONE", title: "", should_save: false },
    };

    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.masterContext?.existingSchedule ?? [],
    });
  }

  const scheduleTasks = parseScheduleTasksFromMessage(message);

  const schedule: OrchestratorScheduleWire =

    scheduleTasks.length > 0

      ? buildRuleScheduleBlock({

          message,

          existingSchedule: input.masterContext?.existingSchedule ?? [],

          tasks: scheduleTasks,

        }) ?? EMPTY_SCHEDULE_WIRE

      : EMPTY_SCHEDULE_WIRE;



  const containerHint = detectContainerHint({

    message,

    context: input.masterContext,

  });



  const intent =

    scheduleTasks.length > 0

      ? "SCHEDULE"

      : containerHint

        ? "CONTAINER_MGMT"

        : "ACTION";



  const summary =

    schedule.is_conflict && schedule.message

      ? trimSummary(schedule.message)

      : urls.length > 0

        ? trimSummary("링크 실행 준비")

        : /지도|맛집|위치/i.test(lower)

          ? trimSummary(`${placeQuery.slice(0, 8)} 지도`)

          : trimSummary(placeQuery.slice(0, 15) || "바로 실행");



  const slicedActions = actions.slice(0, 4);

  const confidence = estimateRuleOrchestratorConfidence({

    message,

    actionCount: slicedActions.length,

    hasExplicitUrl: urls.length > 0,

  });



  const wire: MasterOrchestratorWire = {

    summary,

    confidence_score: confidence,

    metadata: { intent, trust_level_adjustment: "NONE" },

    actions: slicedActions.map((action) => ({

      label: action.label,

      icon: "link",

      url: action.href ?? "",

    })),

    schedule,

    container: containerHint ?? { action: "NONE", title: "", should_save: false },

  };



  return normalizeMasterOrchestratorWire({

    wire,

    source: "rules",

    existingSchedule: input.masterContext?.existingSchedule ?? [],

  });

}


