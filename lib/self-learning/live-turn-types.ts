import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { FailureKind } from "@/lib/self-learning/types";

export type LiveTurnStage = "input" | "routing" | "output";

export type LiveTurnRouting = {
  chat_axis_route?: string;
  routing_patch?: string;
  ai_intent?: string;
  semantic_reason?: string;
  abstraction_level?: string;
  recovery_primary?: string;
};

export type LiveTurnLogEntry = {
  type: "live_turn";
  stage: LiveTurnStage;
  timestamp: string;
  messageId?: string;
  userMessage: string;
  assistantSummary?: string;
  chatAxis?: ChatAxis;
  routing?: LiveTurnRouting;
  vitality?: string[];
  implicitSignals?: string[];
  failureKind?: FailureKind;
  isFailure?: boolean;
  latencyMs?: number;
  source: "client" | "server";
};

export type LiveTurnRequest = Omit<LiveTurnLogEntry, "type" | "timestamp"> & {
  timestamp?: string;
};
