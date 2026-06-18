import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

export type ContextRepairResult =
  | {
      kind: "reconstructed";
      query: string;
      priorIntent: string;
      priorDomain: string;
      confidence: number;
    }
  | { kind: "clarify"; summary: string; confidence: number }
  | { kind: "none" };

export const CONTEXT_DRIFT_EXTENDED =
  /^(?:그거|그\s*거|아까(?:\s*거)?|비슷(?:하게)?|전에(?:\s*했던)?|대충\s*알아서|적당히|느낌대로|전에처럼|비슷하게\s*처리|그거\s*말한\s*거|아까\s*거\s*기준|그거\s*비슷한(?:데)?\s*다른)/iu;

function lastUserTurn(history: readonly OrchestrateHistoryTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role === "user" && turn.content.trim()) {
      return turn.content.trim();
    }
  }
  return null;
}

function lastAssistantTurn(history: readonly OrchestrateHistoryTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role === "assistant" && turn.content.trim()) {
      return turn.content.trim();
    }
  }
  return null;
}

function inferDomain(text: string): { intent: string; domain: string; confidence: number } | null {
  if (/맛집|먹|배고|식당|점심|저녁/u.test(text)) {
    return { intent: "food", domain: "meal", confidence: 0.75 };
  }
  if (/일정|스케줄|약속|캘린더/u.test(text)) {
    return { intent: "schedule", domain: "calendar", confidence: 0.75 };
  }
  if (/사도|구매|옷|쇼핑|vs/u.test(text)) {
    return { intent: "decision", domain: "purchase", confidence: 0.7 };
  }
  if (/운동|헬스|다이어트/u.test(text)) {
    return { intent: "health", domain: "fitness", confidence: 0.65 };
  }
  if (/선택|판단|사도|괜찮/u.test(text)) {
    return { intent: "decision", domain: "general", confidence: 0.55 };
  }
  return null;
}

function reconstructStack(history: readonly OrchestrateHistoryTurn[]): {
  priorIntent: string;
  priorDomain: string;
  query: string;
  confidence: number;
} | null {
  const priorUser = lastUserTurn(history);
  const priorAssistant = lastAssistantTurn(history);

  const userDomain = priorUser ? inferDomain(priorUser) : null;
  const assistantDomain = priorAssistant ? inferDomain(priorAssistant) : null;

  if (userDomain && assistantDomain && userDomain.intent === assistantDomain.intent) {
    return {
      priorIntent: userDomain.intent,
      priorDomain: userDomain.domain,
      query: priorUser ?? priorAssistant ?? "",
      confidence: 0.82,
    };
  }

  if (userDomain) {
    return {
      priorIntent: userDomain.intent,
      priorDomain: userDomain.domain,
      query: priorUser ?? "",
      confidence: userDomain.confidence,
    };
  }

  if (assistantDomain) {
    return {
      priorIntent: assistantDomain.intent,
      priorDomain: assistantDomain.domain,
      query: priorAssistant ?? "",
      confidence: Math.max(0.45, assistantDomain.confidence - 0.15),
    };
  }

  if (priorUser) {
    return {
      priorIntent: "general",
      priorDomain: "unknown",
      query: priorUser,
      confidence: 0.35,
    };
  }

  return null;
}

export function isExtendedContextDriftInput(message: string): boolean {
  return CONTEXT_DRIFT_EXTENDED.test(message.trim());
}

/**
 * PATCH2+ — attempt 2-level reconstruction before clarifying.
 * confidence < 0.5 → clarify (caller may swap to simplify clarify).
 */
export function repairContextDrift(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): ContextRepairResult {
  if (!isExtendedContextDriftInput(message)) {
    return { kind: "none" };
  }

  if (!history?.length) {
    return {
      kind: "clarify",
      confidence: 0.2,
      summary:
        "아까 주제가 기억나지 않아요.\n\nA) 맛집·음식\nB) 일정·약속\nC) 선택·구매\n\n👉 **어느 쪽**을 이어갈까요?",
    };
  }

  const stack = reconstructStack(history);
  if (!stack) {
    return {
      kind: "clarify",
      confidence: 0.25,
      summary:
        "방금 전 주제가 기억나지 않아요.\n\nA) 맛집·음식\nB) 일정·약속\nC) 선택·구매\n\n👉 **어느 쪽**을 비슷하게 이어갈까요?",
    };
  }

  if (stack.confidence < 0.5) {
    return {
      kind: "clarify",
      confidence: stack.confidence,
      summary:
        "아까 주제를 **완전히** 못 잡았어요.\n\nA) 맛집·음식\nB) 일정·약속\nC) 선택·구매\n\n👉 어느 쪽이었는지 알려주세요.",
    };
  }

  const wantsVariant = /다른\s*거|비슷한(?:데)?/u.test(message);
  let query = stack.query;

  switch (stack.priorIntent) {
    case "food":
      query = wantsVariant
        ? `${stack.query} 비슷한 다른 맛집`
        : stack.query.includes("맛집")
          ? `${stack.query} 비슷한 곳`
          : `${stack.query} 맛집 추천`;
      break;
    case "schedule":
      query = stack.query || "일정 정리";
      break;
    case "decision":
      query = stack.query || "이 선택 판단";
      break;
    default:
      query = stack.query || message;
      break;
  }

  return {
    kind: "reconstructed",
    query,
    priorIntent: stack.priorIntent,
    priorDomain: stack.priorDomain,
    confidence: stack.confidence,
  };
}
