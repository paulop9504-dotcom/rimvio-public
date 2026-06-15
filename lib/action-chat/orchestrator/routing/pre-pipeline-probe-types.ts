import type {
  EarlyOrchestratorDecision,
  OrchestratorPipelineBase,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";

/** One pre-pipeline routing step — returns a decision or null to continue. */
export type PrePipelineProbe = (
  base: OrchestratorPipelineBase,
) => Promise<EarlyOrchestratorDecision | null>;
