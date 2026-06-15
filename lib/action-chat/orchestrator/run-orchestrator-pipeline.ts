import type { OrchestratorPipelineInput } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  buildOrchestratorPipelineBase,
  completeEarlyOrchestratorDecision,
  prepareStandardPipelineContext,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import { resolveOrchestratorEarlyDecision } from "@/lib/action-chat/orchestrator/resolve-orchestrator-decision";
import { runOrchestratorStandardPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-standard-pipeline";

/**
 * Orchestrator entry — single decision tree:
 * 1) Pre-pipeline probes (`resolveOrchestratorEarlyDecision`)
 * 2) Standard path: tier/event → enrichment → resolve (`runOrchestratorStandardPipeline`)
 */
export async function runOrchestratorPipeline(
  input: OrchestratorPipelineInput,
): Promise<OrchestratorResult> {
  const base = await buildOrchestratorPipelineBase(input);
  const early = await resolveOrchestratorEarlyDecision(base);
  if (early) {
    return completeEarlyOrchestratorDecision(base, early);
  }
  const ctx = await prepareStandardPipelineContext(base);
  return runOrchestratorStandardPipeline(base, ctx);
}
