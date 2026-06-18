/** Unified agent output schema — middleware forces structure before tool calls. */
export type AgentActionKind =
  | "SEARCH"
  | "SCHEDULE"
  | "CHAT"
  | "PROACTIVE_ALERT"
  | "TEMPORAL_SCHEDULE";

/** @see global-brain-actionable-output.ts — LLM-facing Actionable UI JSON */
export type { GlobalBrainActionableWire } from "@/lib/global-brain/global-brain-actionable-output";

export type AgentOutput = {
  action: AgentActionKind;
  data: Record<string, unknown>;
  reasoning: string;
  /** Metacognition — self-reflection for feedback loop */
  self_reflection?: string;
};

export function buildAgentOutput(input: AgentOutput): AgentOutput {
  return input;
}
