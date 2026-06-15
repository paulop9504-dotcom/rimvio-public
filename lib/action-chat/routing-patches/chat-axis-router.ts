import {
  mergeOrchestratorMetadata,
  type OrchestrateHistoryTurn,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  isMealAxisQuery,
  isScheduleAxisQuery,
} from "@/lib/action-chat/chat-three-axis";
import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import { orchestrateDecisionPriorityOverride } from "@/lib/action-chat/routing-patches/decision-priority-override";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { toMealDiscoveryQuery } from "@/lib/event-kernel/execution-planner/to-meal-discovery-query";
import { orchestrateScheduleIntelligence } from "@/lib/schedule-intelligence/orchestrate-schedule-intelligence";
import { isScheduleIntelligenceQuery } from "@/lib/schedule-intelligence/parse-schedule-query";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import { tryTravelTripAnnouncement } from "@/lib/action-chat/try-travel-trip-announcement";

function withAxisMeta(
  result: OrchestratorResult,
  chatAxis: ChatAxis,
  route: string
): OrchestratorResult {
  return {
    ...result,
    metadata: mergeOrchestratorMetadata(result.metadata, {
      chat_axis: chatAxis,
      chat_axis_route: route,
    }),
  };
}

function buildDecisionAxisResult(
  message: string,
  chatAxis: ChatAxis
): OrchestratorResult | null {
  const forced = orchestrateDecisionPriorityOverride(message, chatAxis);
  if (forced) {
    return withAxisMeta(forced, chatAxis, "decision_force");
  }
  const ai = orchestrateAiIntent(message);
  if (ai) {
    return withAxisMeta(ai, chatAxis, "decision_ai_intent");
  }
  return null;
}

/** Axis-aware fast paths — hit-and-run before generic pipeline branches. */
export async function tryChatAxisEarlyRoute(input: {
  chatAxis?: ChatAxis;
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  referenceDate: string;
  existingSchedule: ExistingScheduleInput;
}): Promise<OrchestratorResult | null> {
  const { chatAxis, message } = input;
  if (!chatAxis) {
    return null;
  }

  if (chatAxis === "decision") {
    const travel = tryTravelTripAnnouncement({
      message,
      referenceDate: input.referenceDate,
    });
    if (travel) {
      return withAxisMeta(travel, chatAxis, "travel_trip_announcement");
    }
    return buildDecisionAxisResult(message, chatAxis);
  }

  if (chatAxis === "schedule") {
    const travel = tryTravelTripAnnouncement({
      message,
      referenceDate: input.referenceDate,
    });
    if (travel) {
      return withAxisMeta(travel, chatAxis, "travel_trip_announcement");
    }
    if (isScheduleIntelligenceQuery(message) || isScheduleAxisQuery(message)) {
      const schedule = await orchestrateScheduleIntelligence({
        message,
        referenceDate: input.referenceDate,
        existingSchedule: input.existingSchedule,
      });
      if (schedule) {
        return withAxisMeta(schedule, chatAxis, "schedule_intelligence");
      }
    }
    const decision = buildDecisionAxisResult(message, chatAxis);
    if (decision) {
      return decision;
    }
    return null;
  }

  if (chatAxis === "meal") {
    if (isMealAxisQuery(message)) {
      const query = toMealDiscoveryQuery(message);
      const discovery = await orchestratePlaceRecommendation(query, {
        history: input.history ? [...input.history] : undefined,
      });
      if (discovery) {
        return withAxisMeta(discovery, chatAxis, "meal_discovery");
      }
      return withAxisMeta(
        {
          summary: `${query.includes("맛집") ? query : `${query} 맛집`}을 찾아볼게요.`,
          actions: [
            {
              id: "meal-axis-search",
              label: "맛집 검색",
              kind: "custom",
              payload: { query },
            },
          ],
          source: "rules",
          confidence: 0.86,
          disclosure: "high",
          actionsRevealed: true,
          pendingConfirm: false,
          metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
        },
        chatAxis,
        "meal_search_stub"
      );
    }
    return null;
  }

  return null;
}
