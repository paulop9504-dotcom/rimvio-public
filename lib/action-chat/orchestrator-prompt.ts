import { buildMasterOrchestratorSystemPrompt } from "@/lib/action-chat/master-orchestrator-prompt";

/** @deprecated use buildMasterOrchestratorSystemPrompt() */
export function buildOrchestratorSystemPrompt() {
  return buildMasterOrchestratorSystemPrompt();
}

/** Legacy task block — kept for tests referencing ACTION_ORCHESTRATOR_TASK */
export const ACTION_ORCHESTRATOR_TASK = "See master-orchestrator-prompt.ts";

/** @deprecated use buildMasterOrchestratorSystemPrompt() */
export const ACTION_ORCHESTRATOR_PROMPT = buildMasterOrchestratorSystemPrompt();
