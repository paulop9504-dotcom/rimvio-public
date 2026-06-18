import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";

export type HitRunFeedbackVerdict = "up" | "down";

export type HitRunFeedbackEntry = {
  type: "hit_run_feedback";
  timestamp: string;
  verdict: HitRunFeedbackVerdict;
  messageId: string;
  userMessage: string;
  assistantSummary: string;
  chatAxis?: ChatAxis;
  routing?: {
    chat_axis_route?: string;
    routing_patch?: string;
    ai_intent?: string;
    semantic_reason?: string;
  };
};

export type HitRunFeedbackRequest = {
  verdict: HitRunFeedbackVerdict;
  messageId: string;
  userMessage?: string;
  assistantSummary: string;
  chatAxis?: ChatAxis;
  metadata?: Record<string, unknown>;
};
