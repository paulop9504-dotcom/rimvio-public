import type { PluginDomain } from "@/lib/plugin-registry/types";

export type CandidateDomain = Extract<PluginDomain, "travel" | "work">;

export type ActionCategoryHint = "main" | "auxiliary";

export type LlmActionCandidateWire = {
  id: string;
  label: string;
  plugin: string;
  category_hint: ActionCategoryHint;
  reason: string;
  source: "rules" | "llm";
};

export type LlmActionCandidateInput = {
  title: string;
  location?: string | null;
  minutes_until_event?: number | null;
  message?: string;
  spawn_phase?: string;
  domain?: CandidateDomain | null;
  /** group = no personal vitality candidates on shared plan layer */
  planMode?: import("@/lib/plan-context/plan-context-types").PlanMode;
};

export type LlmActionCandidateResult = {
  domain: CandidateDomain | null;
  candidates: LlmActionCandidateWire[];
  source: "rules" | "llm" | "mixed";
};

export type LlmCandidateGeneratorWire = {
  action_candidates: Array<{
    label: string;
    plugin: string;
    category_hint: ActionCategoryHint;
    reason?: string;
  }>;
};
