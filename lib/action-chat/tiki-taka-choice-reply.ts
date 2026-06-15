import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

const CHOICE_REPLY = /^([A-Da-d])\)\s*(.+)$/u;

const MEAL_TIKI_HINT =
  /(?:뭐\s*먹|먹을지|식사|맛집|배고|점심|저녁|A\)\s*빠르게|B\)\s*맛|C\)\s*가볍게)/iu;

const SHOPPING_TIKI_HINT = /(?:뭘\s*살|쇼핑|옷|의류|신발)/iu;

const DECISION_TIKI_HINT = /(?:선택|판단|사도|괜찮|기준)/iu;

export function isTikiTakaChoiceReply(message: string): boolean {
  return CHOICE_REPLY.test(message.trim());
}

export function parseTikiTakaChoiceReply(message: string): {
  letter: string;
  text: string;
} | null {
  const match = message.trim().match(CHOICE_REPLY);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { letter: match[1].toUpperCase(), text: match[2].trim() };
}

function lastAssistantText(history: readonly OrchestrateHistoryTurn[]): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role === "assistant" && turn.content.trim()) {
      return turn.content.trim();
    }
  }
  return null;
}

export type TikiTakaChoiceExpansion =
  | { kind: "meal"; query: string; label: string }
  | { kind: "conversation"; summary: string };

/** Turn chip reply (A/B/C) into a concrete meal query or follow-up dialogue. */
export function expandTikiTakaChoiceReply(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): TikiTakaChoiceExpansion | null {
  const choice = parseTikiTakaChoiceReply(message);
  if (!choice) {
    return null;
  }

  const priorAssistant = history?.length ? lastAssistantText(history) : null;
  const hay = `${priorAssistant ?? ""}\n${choice.text}`;

  if (MEAL_TIKI_HINT.test(hay) || /(?:가성비|빠르게|맛\s*기준|가볍게)/u.test(choice.text)) {
    if (/가성비|가격|싸|저렴/u.test(choice.text)) {
      return { kind: "meal", query: "가성비 좋은 맛집 추천", label: "가성비·가격" };
    }
    if (/맛|고기|일식|한식/u.test(choice.text)) {
      return { kind: "meal", query: "맛있는 맛집 추천", label: "맛 기준" };
    }
    if (/가볍|샐러드|샌드|브런치/u.test(choice.text)) {
      return { kind: "meal", query: "가볍게 먹을 맛집 추천", label: "가볍게" };
    }
    return { kind: "meal", query: "근처 맛집 추천", label: choice.text };
  }

  if (SHOPPING_TIKI_HINT.test(hay)) {
    return {
      kind: "conversation",
      summary: `**${choice.text}** 기준으로 보면, 스타일·예산·어디서 살지만 알려주시면 바로 좁혀 드릴게요.\n\n👉 온라인과 매장 중 어디가 더 편하세요?`,
    };
  }

  if (DECISION_TIKI_HINT.test(hay)) {
    return {
      kind: "conversation",
      summary: `**${choice.text}** 기준으로 정리해 볼게요.\n\n👉 지금 당장 필요한지, 아니면 비교만 하고 싶은지 알려주세요.`,
    };
  }

  return {
    kind: "conversation",
    summary: `**${choice.text}** 쪽으로 이어갈게요.\n\n👉 조금만 더 구체적으로 말씀해 주시면 다음 선택지를 좁혀 드릴게요.`,
  };
}
