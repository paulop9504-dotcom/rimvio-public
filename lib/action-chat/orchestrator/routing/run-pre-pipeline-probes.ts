import type { EarlyOrchestratorDecision } from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import type { OrchestratorPipelineBase } from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import { PRE_PIPELINE_PROBE_ORDER } from "@/lib/action-chat/orchestrator/routing/probes";

export async function runPrePipelineProbes(
  base: OrchestratorPipelineBase,
): Promise<EarlyOrchestratorDecision | null> {
  for (const probe of PRE_PIPELINE_PROBE_ORDER) {
    const hit = await probe(base);
    if (hit) {
      return hit;
    }
  }
  return null;
}
