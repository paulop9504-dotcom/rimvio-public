import type {
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { VitalityMemoryWire } from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";
import { isChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";
/**
 * §6 — Single server entry for orchestration. Snapshot build stays in `runOrchestratorPipeline` only.
 */
import { runOrchestratorPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-pipeline";

export type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

export async function orchestrateUserMessage(input: {
  message: string;
  composerContext?: string | null;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  linkUrl?: string | null;
  linkCategory?: string | null;
  linkedLinks?: Array<{
    id: string;
    title: string;
    url: string | null;
    category: string | null;
  }>;
  masterContext?: MasterContextApiPayload | null;
  userDefinedActions?: UserDefinedAction[];
  sessionScopeId?: string;
  chatAxis?: ChatAxis;
  vitalityMemory?: VitalityMemoryWire | null;
}): Promise<OrchestratorResult> {
  return runOrchestratorPipeline(input);
}
