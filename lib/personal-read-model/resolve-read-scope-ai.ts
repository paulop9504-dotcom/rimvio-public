import type { PinScope } from "@/lib/globe/pin-entity";
import { resolveScopeAiPersona } from "@/lib/scope-ai/scope-ai-policy";

/** Map pin scope to PRM Scope AI persona. */
export function resolveReadScopeAi(scope: PinScope = "internal"): "guardian" | "explorer" {
  return resolveScopeAiPersona(scope);
}
