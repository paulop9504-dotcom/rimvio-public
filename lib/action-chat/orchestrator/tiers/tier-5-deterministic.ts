import {
  buildDatePickerOrchestratorResult,
  detectVerbWithoutTime,
} from "@/lib/action-chat/action-oriented-handler";
import { orchestrateScheduleListBatch } from "@/lib/global-brain/orchestrate-schedule-list-batch";
import { orchestrateTemporalSchedule } from "@/lib/global-brain/orchestrate-temporal-schedule";
import { orchestrateTimeDecision } from "@/lib/time-decision/orchestrate-time-decision";
import { orchestrateMorningBriefing } from "@/lib/morning-orchestrator/orchestrate-morning-briefing";
import { orchestrateExperienceGuidance } from "@/lib/experience/orchestrate-experience-guidance";
import { orchestrateScheduleIntelligence } from "@/lib/schedule-intelligence/orchestrate-schedule-intelligence";
import { orchestrateScheduleAdvisory } from "@/lib/schedule/orchestrate-schedule-advisory";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { orchestrateDataArchitect } from "@/lib/data-architect/orchestrate-data-architect";
import { orchestratePlaceIngestion } from "@/lib/data-ingestion/orchestrate-place-ingestion";
import { tryWittyConversation } from "@/lib/action-chat/witty-response-generator";
import { tryScheduledTravelAction } from "@/lib/action-chat/try-scheduled-travel-action";
import { tryTravelTripAnnouncement } from "@/lib/action-chat/try-travel-trip-announcement";
import { tryDeepLinkDispatchOrchestration } from "@/lib/deep-link-dispatch/orchestrate-deep-link-dispatch";
import { orchestrateHybridRetrieval } from "@/lib/hybrid-retrieval/orchestrate-hybrid-retrieval";
import { orchestrateProductInjector } from "@/lib/product-injector/orchestrate-product-injector";
import { orchestrateShadowDashboard } from "@/lib/notification-shadow/orchestrate-shadow-dashboard";
import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import { orchestrateConversation } from "@/lib/action-chat/conversation-turns";
import { orchestrateByRules } from "@/lib/action-chat/rule-orchestrator";
import { extractGoalFromMessage } from "@/lib/goal-roadmap/goal-roadmap-store";
import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";

export const TIER_5_DETERMINISTIC_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 5,
    label: "Deterministic",
    detail: "ScheduleListBatch",
    run: (ctx) =>
      orchestrateScheduleListBatch({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "TemporalSchedule",
    run: (ctx) =>
      orchestrateTemporalSchedule({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
        allReminders: ctx.input.masterContext?.allReminders,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "TimeDecision",
    run: (ctx) =>
      orchestrateTimeDecision({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "MorningBriefing",
    run: async (ctx) =>
      orchestrateMorningBriefing({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
        existingSchedule: ctx.context.existingSchedule,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ExperienceGuidance",
    run: (ctx) => orchestrateExperienceGuidance(ctx.message),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ScheduleIntelligence",
    run: async (ctx) => {
      void extractGoalFromMessage(ctx.message);
      return orchestrateScheduleIntelligence({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
        existingSchedule: ctx.context.existingSchedule,
        reminders: ctx.input.masterContext?.allReminders,
        goals: ctx.input.masterContext?.userGoals,
        activitySources: ctx.input.masterContext?.activitySources,
      });
    },
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ScheduleAdvisory",
    run: (ctx) =>
      orchestrateScheduleAdvisory({
        message: ctx.message,
        existingSchedule: ctx.context.existingSchedule,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "TravelTripAnnouncement",
    run: (ctx) =>
      tryTravelTripAnnouncement({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ScheduledTravel",
    run: (ctx) =>
      tryScheduledTravelAction({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "AiIntent",
    run: (ctx) => orchestrateAiIntent(ctx.message),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "PlaceRecommendation",
    run: async (ctx) =>
      orchestratePlaceRecommendation(ctx.message, { history: ctx.input.history }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "DataArchitect",
    run: async (ctx) =>
      orchestrateDataArchitect({
        rawInput: ctx.message,
        message: ctx.message,
        linkTitle: ctx.scoped.linkTitle,
        linkUrl: ctx.scoped.linkUrl,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "PlaceIngestion",
    run: async (ctx) => orchestratePlaceIngestion(ctx.message),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "VerbDatePicker",
    run: (ctx) => {
      const verbDraft = detectVerbWithoutTime(ctx.message);
      return verbDraft
        ? buildDatePickerOrchestratorResult({ draftTask: verbDraft })
        : null;
    },
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "WittyRule",
    run: (ctx) => tryWittyConversation(ctx.message),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "HybridRetrieval",
    run: async (ctx) => orchestrateHybridRetrieval({ message: ctx.message }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ProductInjector",
    run: async (ctx) => orchestrateProductInjector({ message: ctx.message }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "DeepLinkDispatch",
    run: (ctx) => tryDeepLinkDispatchOrchestration({ message: ctx.message }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "ShadowDashboardQuery",
    run: (ctx) => orchestrateShadowDashboard(ctx.message),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "Conversation",
    run: (ctx) =>
      orchestrateConversation({
        message: ctx.message,
        linkTitle: ctx.scoped.linkTitle,
      }),
  },
  {
    tier: 5,
    label: "Deterministic",
    detail: "EmptyRules",
    run: (ctx) =>
      !ctx.message
        ? orchestrateByRules({
            ...ctx.scoped,
            history: ctx.input.history,
            masterContext: ctx.context,
            intentRoute: ctx.route,
            userDefinedActions: ctx.userDefinedActions,
          })
        : null,
  },
];
