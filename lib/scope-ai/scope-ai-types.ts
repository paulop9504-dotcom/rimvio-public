/**
 * Scope AI — internal Guardian vs external Explorer.
 * @see docs/RIMVIO_SCOPE_AI.md
 */

import type { PinScope } from "@/lib/globe/pin-entity";

export type ScopeAiPersona = "guardian" | "explorer";

export type InternalScopeVerb = "recall" | "nudge" | "preserve";
export type ExternalScopeVerb = "discover" | "connect" | "compose";

export type ScopeAiCapability =
  | "recall_surface"
  | "proactive_nudge"
  | "preserve_intent"
  | "discovery_list_hero"
  | "trace_compose"
  | "intent_override"
  | "life_plan_rewrite"
  | "discover_traces"
  | "connect_threads"
  | "compose_flow"
  | "private_schedule_nudge";

export type ScopeAiPolicy = {
  scope: PinScope;
  persona: ScopeAiPersona;
  slogan: string;
  verbs: readonly (InternalScopeVerb | ExternalScopeVerb)[];
  allowed: readonly ScopeAiCapability[];
  forbidden: readonly ScopeAiCapability[];
};

export type ScopeAiGateResult = {
  scope: PinScope;
  persona: ScopeAiPersona;
  policy: ScopeAiPolicy;
  blockedCapabilities: ScopeAiCapability[];
};

/** Orchestrator metadata keys — stamped on every pipeline exit. */
export const SCOPE_AI_PIN_SCOPE_META_KEY = "pin_scope" as const;
export const SCOPE_AI_PERSONA_META_KEY = "scope_ai_persona" as const;
export const SCOPE_AI_BLOCKED_META_KEY = "scope_ai_blocked" as const;

export function isScopeAiPersona(value: unknown): value is ScopeAiPersona {
  return value === "guardian" || value === "explorer";
}
