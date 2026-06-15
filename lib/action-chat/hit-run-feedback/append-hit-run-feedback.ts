import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  HitRunFeedbackEntry,
  HitRunFeedbackRequest,
} from "@/lib/action-chat/hit-run-feedback/types";

const DEFAULT_LOG = join(process.cwd(), ".cursor", "hit-run-feedback.jsonl");

export function getHitRunFeedbackLogPath(): string {
  return process.env.RIMVIO_HIT_RUN_FEEDBACK_LOG ?? DEFAULT_LOG;
}

function pickRouting(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }
  const routing = {
    chat_axis_route:
      typeof metadata.chat_axis_route === "string"
        ? metadata.chat_axis_route
        : undefined,
    routing_patch:
      typeof metadata.routing_patch === "string"
        ? metadata.routing_patch
        : undefined,
    ai_intent:
      typeof metadata.ai_intent === "string" ? metadata.ai_intent : undefined,
    semantic_reason:
      typeof metadata.semantic_reason === "string"
        ? metadata.semantic_reason
        : undefined,
  };
  if (
    !routing.chat_axis_route &&
    !routing.routing_patch &&
    !routing.ai_intent &&
    !routing.semantic_reason
  ) {
    return undefined;
  }
  return routing;
}

export function buildHitRunFeedbackEntry(
  input: HitRunFeedbackRequest
): HitRunFeedbackEntry {
  return {
    type: "hit_run_feedback",
    timestamp: new Date().toISOString(),
    verdict: input.verdict,
    messageId: input.messageId,
    userMessage: input.userMessage?.trim() ?? "",
    assistantSummary: input.assistantSummary.trim(),
    chatAxis: input.chatAxis,
    routing: pickRouting(input.metadata),
  };
}

export function appendHitRunFeedback(
  input: HitRunFeedbackRequest,
  logPath = getHitRunFeedbackLogPath()
): HitRunFeedbackEntry {
  const entry = buildHitRunFeedbackEntry(input);
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}
