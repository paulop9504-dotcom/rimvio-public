import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { classifyAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isDecisionAvoidanceInput } from "@/lib/action-chat/adaptive-behavior/detect-decision-avoidance";

const SHORT_QUERY = /^.{1,18}$/u;
const REPEAT_NORMALIZE = /[\s!?.,~ㅋㅎㅠㅜ]+/gu;

function normalizeForRepeat(text: string): string {
  return text.trim().replace(REPEAT_NORMALIZE, "").toLowerCase();
}

function recentUserTurns(
  history: readonly OrchestrateHistoryTurn[],
  limit = 6
): string[] {
  const turns: string[] = [];
  for (let i = history.length - 1; i >= 0 && turns.length < limit; i -= 1) {
    const turn = history[i];
    if (turn.role === "user" && turn.content.trim()) {
      turns.push(turn.content.trim());
    }
  }
  return turns;
}

/** Shorter turns, repeated phrasing, rising "그냥/알아서" → decision fatigue. */
export function detectDecisionFatigue(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): boolean {
  const trimmed = message.trim();
  const abstraction = classifyAbstractionLevel(trimmed);

  if (isDecisionAvoidanceInput(trimmed)) {
    return true;
  }

  if (abstraction.level === "L0" || abstraction.level === "L1") {
    if (/^(?:그냥|음|흠|별로)/iu.test(trimmed)) {
      return true;
    }
  }

  if (!history?.length) {
    return false;
  }

  const users = recentUserTurns(history);
  if (users.length >= 2) {
    const current = normalizeForRepeat(trimmed);
    const repeats = users.filter(
      (turn) => normalizeForRepeat(turn) === current
    ).length;
    if (repeats >= 1) {
      return true;
    }
  }

  const justCount = users.filter((turn) => /그냥|알아서|대충/u.test(turn)).length;
  if (justCount >= 2) {
    return true;
  }

  const shortCount = users.filter((turn) => SHORT_QUERY.test(turn)).length;
  if (shortCount >= 3 && (abstraction.level === "L0" || abstraction.level === "L1")) {
    return true;
  }

  const assistantBranches = history.filter(
    (turn) =>
      turn.role === "assistant" &&
      /(?:A\)|B\)|C\)|👉)/u.test(turn.content)
  ).length;
  if (assistantBranches >= 2 && isDecisionAvoidanceInput(trimmed)) {
    return true;
  }

  return false;
}
