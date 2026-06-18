import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LiveTurnLogEntry, LiveTurnRequest } from "@/lib/self-learning/live-turn-types";

const DEFAULT_LOG = join(process.cwd(), ".cursor", "rimvio-live-turns.jsonl");

export function getLiveTurnLogPath(): string {
  return process.env.RIMVIO_LIVE_TURN_LOG ?? DEFAULT_LOG;
}

export function pickRoutingFromMetadata(
  metadata?: Record<string, unknown>
): LiveTurnLogEntry["routing"] {
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
    abstraction_level:
      typeof metadata.abstraction_level === "string"
        ? metadata.abstraction_level
        : undefined,
    recovery_primary:
      typeof metadata.recovery_primary === "string"
        ? metadata.recovery_primary
        : undefined,
  };
  if (
    !routing.chat_axis_route &&
    !routing.routing_patch &&
    !routing.ai_intent &&
    !routing.semantic_reason &&
    !routing.abstraction_level &&
    !routing.recovery_primary
  ) {
    return undefined;
  }
  return routing;
}

export function buildLiveTurnEntry(input: LiveTurnRequest): LiveTurnLogEntry {
  return {
    type: "live_turn",
    timestamp: input.timestamp ?? new Date().toISOString(),
    stage: input.stage,
    messageId: input.messageId,
    userMessage: input.userMessage.trim(),
    assistantSummary: input.assistantSummary?.trim(),
    chatAxis: input.chatAxis,
    routing: input.routing,
    vitality: input.vitality,
    implicitSignals: input.implicitSignals,
    failureKind: input.failureKind,
    isFailure: input.isFailure,
    latencyMs: input.latencyMs,
    source: input.source,
  };
}

export function buildLiveTurnFromOrchestrator(input: {
  stage: LiveTurnLogEntry["stage"];
  userMessage: string;
  assistantSummary?: string;
  messageId?: string;
  chatAxis?: LiveTurnLogEntry["chatAxis"];
  metadata?: Record<string, unknown>;
  vitality?: string[];
  implicitSignals?: string[];
  failureKind?: LiveTurnLogEntry["failureKind"];
  isFailure?: boolean;
  latencyMs?: number;
  source: LiveTurnLogEntry["source"];
}): LiveTurnLogEntry {
  return buildLiveTurnEntry({
    stage: input.stage,
    messageId: input.messageId,
    userMessage: input.userMessage,
    assistantSummary: input.assistantSummary,
    chatAxis: input.chatAxis,
    routing: pickRoutingFromMetadata(input.metadata),
    vitality: input.vitality,
    implicitSignals: input.implicitSignals,
    failureKind: input.failureKind,
    isFailure: input.isFailure,
    latencyMs: input.latencyMs,
    source: input.source,
  });
}

export function appendLiveTurn(
  input: LiveTurnRequest,
  logPath = getLiveTurnLogPath()
): LiveTurnLogEntry {
  const entry = buildLiveTurnEntry(input);
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}
