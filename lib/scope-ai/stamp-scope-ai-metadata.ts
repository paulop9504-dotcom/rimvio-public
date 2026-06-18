import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { mergeOrchestratorMetadata } from "@/lib/action-chat/orchestrator-types";
import type { ScopeAiGateResult } from "@/lib/scope-ai/scope-ai-types";
import {
  SCOPE_AI_BLOCKED_META_KEY,
  SCOPE_AI_PERSONA_META_KEY,
  SCOPE_AI_PIN_SCOPE_META_KEY,
} from "@/lib/scope-ai/scope-ai-types";

export function buildScopeAiMetadataPatch(
  gate: ScopeAiGateResult,
): Record<string, unknown> {
  return {
    [SCOPE_AI_PIN_SCOPE_META_KEY]: gate.scope,
    [SCOPE_AI_PERSONA_META_KEY]: gate.persona,
    ...(gate.blockedCapabilities.length > 0
      ? { [SCOPE_AI_BLOCKED_META_KEY]: gate.blockedCapabilities }
      : {}),
  };
}

export function stampOrchestratorScopeAi(
  result: OrchestratorResult,
  gate: ScopeAiGateResult,
): OrchestratorResult {
  return {
    ...result,
    metadata: mergeOrchestratorMetadata(
      result.metadata,
      buildScopeAiMetadataPatch(gate),
    ),
  };
}
