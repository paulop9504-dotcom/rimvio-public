import { tryContainerActionGate } from "@/lib/containers/enforce-container-actions";
import { orchestrateConversationRecall } from "@/lib/conversation-memory/orchestrate-conversation-recall";
import { tryKnowledgeRecall } from "@/lib/action-chat/action-oriented-handler";
import { orchestrateTripInteraction } from "@/lib/trip-controller/orchestrate-trip-interaction";
import { orchestratePlaceConfirm } from "@/lib/action-chat/orchestrate-place-confirm";
import { orchestrateScheduleListBatch } from "@/lib/global-brain/orchestrate-schedule-list-batch";
import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";

export const TIER_3_WORKFLOW_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 3,
    label: "Workflow",
    detail: "ScheduleListBatch",
    run: (ctx) =>
      orchestrateScheduleListBatch({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 3,
    label: "Workflow",
    detail: "ContainerGate",
    run: (ctx) =>
      ctx.input.masterContext?.containerGateEnabled === true
        ? tryContainerActionGate({
            message: ctx.message,
            activeChains: ctx.context.activeChains,
            legacyChainIds: ctx.context.activeChain?.containerIds,
          })
        : null,
  },
  {
    tier: 3,
    label: "Workflow",
    detail: "ConversationRecall",
    run: (ctx) =>
      orchestrateConversationRecall({
        message: ctx.message,
        memories: ctx.input.masterContext?.conversationMemories,
      }),
  },
  {
    tier: 3,
    label: "Workflow",
    detail: "KnowledgeRecall",
    run: async (ctx) =>
      tryKnowledgeRecall(ctx.message, {
        placePreferences: ctx.input.masterContext?.placePreferences ?? [],
      }),
  },
  {
    tier: 3,
    label: "Workflow",
    detail: "Trip",
    run: (ctx) =>
      orchestrateTripInteraction({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
      }),
  },
  {
    tier: 3,
    label: "Workflow",
    detail: "PlaceConfirm",
    run: async (ctx) =>
      orchestratePlaceConfirm({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
        existingSchedule: ctx.context.existingSchedule,
        locationMemory: ctx.locationMemory,
        priorPlaceChoice: ctx.input.masterContext?.priorPlaceChoice ?? null,
      }),
  },
];
