import { appendLiveTurn, buildLiveTurnFromOrchestrator, pickRoutingFromMetadata } from "@/lib/self-learning/append-live-turn";
import { detectImplicitSignals } from "@/lib/self-learning/implicit-signals";
import { classifyFailure } from "@/lib/self-learning/failure-classifier";
import type { LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";
import type { ChatTurn } from "@/lib/self-learning/types";

export function observeAndLogLiveTurn(input: {
  stage: LiveTurnLogEntry["stage"];
  userMessage: string;
  assistantSummary?: string;
  messageId?: string;
  chatAxis?: LiveTurnLogEntry["chatAxis"];
  metadata?: Record<string, unknown>;
  vitality?: string[];
  latencyMs?: number;
  source: LiveTurnLogEntry["source"];
  history?: ChatTurn[];
  logPath?: string;
}): LiveTurnLogEntry {
  const history = input.history ?? [];
  const implicitSignals =
    input.stage === "output" && input.assistantSummary
      ? detectImplicitSignals(input.userMessage, history)
      : [];

  let failureKind: LiveTurnLogEntry["failureKind"];
  let isFailure: boolean | undefined;

  if (input.stage === "output" && input.assistantSummary) {
    const routing = pickRoutingFromMetadata(input.metadata);
    const classified = classifyFailure({
      userMessage: input.userMessage,
      assistantSummary: input.assistantSummary,
      routing,
      implicitSignals,
      history,
    });
    failureKind = classified.failureKind;
    isFailure = classified.isFailure;
  }

  const entry = buildLiveTurnFromOrchestrator({
    stage: input.stage,
    userMessage: input.userMessage,
    assistantSummary: input.assistantSummary,
    messageId: input.messageId,
    chatAxis: input.chatAxis,
    metadata: input.metadata,
    vitality: input.vitality,
    implicitSignals: implicitSignals.map((signal) => signal.kind),
    failureKind,
    isFailure,
    latencyMs: input.latencyMs,
    source: input.source,
  });

  return appendLiveTurn(entry, input.logPath);
}
