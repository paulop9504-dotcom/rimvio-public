import { injectShadowContext } from "@/lib/notification-shadow/inject-shadow-context";
import { runGlobalBrainMiddleware } from "@/lib/global-brain/run-global-brain-middleware";
import { resolveOrchestratorContextBlock } from "@/lib/context-resolver/resolve-orchestrator-context";
import { composeLocationIntelligenceContext } from "@/lib/location-intelligence/compose-location-context";
import { buildDeepRetrievalPromptBlock } from "@/lib/schedule-intelligence/deep-retrieval-prompt";
import { buildTimeDecisionPromptBlock } from "@/lib/time-decision/time-decision-prompt";
import type { OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import { refreshFinalize } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { Phase2Outcome } from "@/lib/action-chat/orchestrator/pipeline-types";

/** PHASE 2 — ENRICHMENT: Tier 6–9, inject only (+ documented Fast Path). */
export async function runPhase2Enrichment(
  ctx: OrchestratorPipelineContext
): Promise<Phase2Outcome> {
  const shadow = injectShadowContext();
  if (shadow.promptBlock) {
    ctx.trace.inject(6, "Shadow", `${shadow.candidates.length}_candidates`);
    ctx.enrichment.shadowCandidates = shadow.candidates;
    ctx.enrichment.shadowContextBlock = shadow.promptBlock;
  } else {
    ctx.trace.pass(2, 6, "Shadow");
  }

  ctx.trace.inject(7, "Container", ctx.containerRoute.container?.title ?? "none");
  ctx.enrichment.containerContextBlock = ctx.containerRoute.contextBlock;

  const brain = await runGlobalBrainMiddleware({
    message: ctx.message,
    masterContext: ctx.input.masterContext,
    route: ctx.route,
    context: ctx.context,
    goalSnapshot: ctx.goalSnapshot,
  });
  ctx.brain = brain;
  refreshFinalize(ctx);

  ctx.trace.inject(8, "GlobalBrain", brain.shouldEnrich ? "memory_injected" : "minimal");
  ctx.enrichment.behaviorContextBlock = brain.promptBlock || null;

  if (brain.proactiveResult) {
    ctx.trace.fastPath(8, "GlobalBrain", "proactiveResult");
    ctx.trace.terminal("EARLY_RETURN");
    return {
      phase: 2,
      enrichment: ctx.enrichment,
      fastPath: brain.proactiveResult,
    };
  }

  const resolvedContext = await resolveOrchestratorContextBlock({
    message: ctx.message,
    referenceDate: ctx.context.currentDate,
    originHint: ctx.locationMemory?.lifeZone?.label ?? null,
  });

  const locationIntelBlock = await composeLocationIntelligenceContext({
    message: ctx.message,
    referenceDate: ctx.context.currentDate,
    locationMemory: ctx.locationMemory,
    jitContextBlock: resolvedContext,
  });

  const deepRetrievalPrompt = buildDeepRetrievalPromptBlock({ message: ctx.message });
  const timeDecisionPrompt = buildTimeDecisionPromptBlock({
    message: ctx.message,
    referenceDate: ctx.context.currentDate,
  });

  const retrieved = [locationIntelBlock, deepRetrievalPrompt, timeDecisionPrompt]
    .filter(Boolean)
    .join("\n\n");

  if (retrieved) {
    ctx.trace.inject(9, "Retrieval", "context_blocks");
    ctx.enrichment.retrievedContextBlock = retrieved;
  } else {
    ctx.trace.pass(2, 9, "Retrieval");
  }

  return {
    phase: 2,
    enrichment: ctx.enrichment,
    fastPath: null,
  };
}
