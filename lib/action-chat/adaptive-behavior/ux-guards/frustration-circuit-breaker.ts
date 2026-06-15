import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { isSlotCollectReply } from "@/lib/event-commit-gate/resolve-slot-collect-reply";
import { classifyAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isCareerAspirationMessage } from "@/lib/action-chat/fallback-recovery/career-role-bank";

const FRUSTRATION =
  /(?:^|\s)(?:아니(?:요|야)?|그게\s*아니|그건\s*아니|아\s*답답|답답하(?:네|다)|됐(?:어|습니다|을)?|그만(?:해)?|됐고|말\s*좀\s*들어)/iu;

function recentUserTurns(
  history: readonly OrchestrateHistoryTurn[] | undefined,
  limit = 4
): string[] {
  if (!history?.length) return [];
  const turns: string[] = [];
  for (let i = history.length - 1; i >= 0 && turns.length < limit; i -= 1) {
    const turn = history[i];
    if (turn.role === "user" && turn.content.trim()) {
      turns.push(turn.content.trim());
    }
  }
  return turns;
}

/** Escalation / loop breaker — stop Tiki and LLM routing. */
export function detectFrustrationEscape(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }

  if (isCareerAspirationMessage(trimmed)) {
    return false;
  }

  if (isSlotCollectReply(trimmed, history)) {
    return false;
  }

  if (FRUSTRATION.test(trimmed)) {
    return true;
  }

  const users = recentUserTurns(history, 3);
  if (users.length >= 2) {
    const l0Streak = users.filter((turn) =>
      isLowAbstractionLevel(classifyAbstractionLevel(turn).level)
    ).length;
    if (l0Streak >= 2 && isLowAbstractionLevel(classifyAbstractionLevel(trimmed).level)) {
      return true;
    }
  }

  const branchFatigue = (history ?? []).filter(
    (turn) =>
      turn.role === "assistant" &&
      /(?:A\)|B\)|C\)|👉)/u.test(turn.content)
  ).length;
  if (branchFatigue >= 2 && FRUSTRATION.test(trimmed)) {
    return true;
  }

  return false;
}

export const FRUSTRATION_ESCAPE_SUMMARY =
  "제가 맥락을 잘못 짚은 것 같아요.\n\n처음부터 편하게 **원하시는 것**만 말씀해 주세요. 선택지 없이 그대로 이어갈게요.";
