import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { HitRunFeedbackEntry } from "@/lib/action-chat/hit-run-feedback/types";
import { getHitRunFeedbackLogPath } from "@/lib/action-chat/hit-run-feedback/append-hit-run-feedback";
import type { ChatTurn, InteractionRecord } from "@/lib/self-learning/types";
import { classifyFailure } from "@/lib/self-learning/failure-classifier";
import { detectImplicitSignals } from "@/lib/self-learning/implicit-signals";

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) {
    return [];
  }
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function readHitRunFeedbackEntries(
  logPath = getHitRunFeedbackLogPath()
): HitRunFeedbackEntry[] {
  return readJsonl<HitRunFeedbackEntry>(logPath).filter(
    (entry) => entry.type === "hit_run_feedback"
  );
}

export function readHardcoreFailureEntries(
  logPath = join(process.cwd(), ".cursor", "hardcore-red-team.log.jsonl")
): Array<{ input: string; failureMode?: string; isFailure?: boolean }> {
  return readJsonl<{
    input?: string;
    failure?: { failureMode?: string; isFailure?: boolean };
  }>(logPath)
    .map((row) => ({
      input: row.input ?? "",
      failureMode: row.failure?.failureMode,
      isFailure: row.failure?.isFailure,
    }))
    .filter((row) => row.input);
}

export function buildInteractionRecords(input: {
  feedbackEntries?: HitRunFeedbackEntry[];
  historyByMessageId?: Record<string, ChatTurn[]>;
}): InteractionRecord[] {
  const entries = input.feedbackEntries ?? readHitRunFeedbackEntries();
  return entries.map((entry) => {
    const history = input.historyByMessageId?.[entry.messageId] ?? [];
    const implicitSignals = detectImplicitSignals(entry.userMessage, history);
    if (entry.verdict === "down") {
      implicitSignals.push({
        kind: "explicit_down",
        message: entry.userMessage,
      });
    }
    const classified = classifyFailure({
      userMessage: entry.userMessage,
      assistantSummary: entry.assistantSummary,
      routing: entry.routing,
      explicitVerdict: entry.verdict,
      implicitSignals,
      history,
    });

    return {
      id: entry.messageId,
      timestamp: entry.timestamp,
      userMessage: entry.userMessage,
      assistantSummary: entry.assistantSummary,
      routing: entry.routing,
      explicitVerdict: entry.verdict,
      implicitSignals,
      failureKind: classified.failureKind,
      isFailure: classified.isFailure,
    };
  });
}

/** Live turn pair — chat mode observation without explicit feedback. */
export function observeLiveTurn(input: {
  userMessage: string;
  assistantSummary: string;
  routing?: InteractionRecord["routing"];
  history?: ChatTurn[];
}): InteractionRecord {
  const implicitSignals = detectImplicitSignals(
    input.userMessage,
    input.history ?? []
  );
  const classified = classifyFailure({
    userMessage: input.userMessage,
    assistantSummary: input.assistantSummary,
    routing: input.routing,
    implicitSignals,
    history: input.history,
  });

  return {
    id: `live-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userMessage: input.userMessage,
    assistantSummary: input.assistantSummary,
    routing: input.routing,
    implicitSignals,
    failureKind: classified.failureKind,
    isFailure: classified.isFailure,
  };
}
