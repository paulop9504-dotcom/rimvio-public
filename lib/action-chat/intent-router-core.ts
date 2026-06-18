import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { MicroIntent } from "@/lib/action-chat/micro-intent";
import type { IntentRouteMeta } from "@/lib/action-chat/orchestrator-types";

export type IntentRoute = IntentRouteMeta & {
  current_topic: string | null;
  relevance_score: number;
  micro_intent: MicroIntent;
  micro_confidence: number;
  stability_score: number;
  turn_pressure: number;
  continuity: "CONTINUE" | "NEW_TASK" | "SHIFT" | "HOLD";
  kernel_entropy: number;
  kernel_decision: "DIRECT_ACTION" | "OPTIONS" | "CLARIFY";
  execution_mode: "action" | "conversation";
};

const SKIP_ASSISTANT_TOPIC =
  /(?:바로\s*실행|잠시\s*만|확인\s*해\s*주|카드에서|로딩|생각\s*중|\.\.\.|…)/i;

const DOMAIN_CUES: Array<{ domain: string; pattern: RegExp }> = [
  { domain: "dining", pattern: /맛집|식당|카페|뷔페|쿠우쿠우|레스토랑|술집|치킨|피자/ },
  { domain: "venue", pattern: /월드컵|경기장|운동장|체육관|구장|스타디움/ },
  { domain: "weather", pattern: /태풍|날씨|기상|폭우|미세먼지|강수/ },
  { domain: "travel", pattern: /여행|호텔|항공|제주|오사카|숙소|펜션/ },
  { domain: "shopping", pattern: /쇼핑|구매|최저가|쿠팡|마켓/ },
];

export function priorHistoryForRoute(
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): OrchestrateHistoryTurn[] {
  const turns = history ?? [];
  if (turns.length === 0) {
    return [];
  }

  const last = turns[turns.length - 1];
  if (last?.role === "user" && last.content.trim() === currentMessage.trim()) {
    return turns.slice(0, -1);
  }

  return turns;
}

function isUsableAssistantTopic(content: string): boolean {
  const cleaned = content
    .replace(/컨테이너.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 4) {
    return false;
  }
  if (SKIP_ASSISTANT_TOPIC.test(cleaned)) {
    return false;
  }
  return true;
}

export function topicTokens(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 2);
}

export function extractCurrentTopic(input: {
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  currentMessage: string;
}): string | null {
  const prior = priorHistoryForRoute(input.history, input.currentMessage);

  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role === "assistant" && turn.content.trim().length >= 4) {
      const cleaned = turn.content
        .replace(/컨테이너.*$/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (isUsableAssistantTopic(cleaned)) {
        return cleaned.slice(0, 60);
      }
    }
  }

  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role === "user" && turn.content.trim().length >= 4) {
      return turn.content.trim().slice(0, 60);
    }
  }

  if (input.linkTitle?.trim()) {
    return input.linkTitle.trim().slice(0, 60);
  }

  return null;
}

export function detectDomain(text: string): string | null {
  for (const cue of DOMAIN_CUES) {
    if (cue.pattern.test(text)) {
      return cue.domain;
    }
  }
  return null;
}

export function scoreTopicRelevance(currentTopic: string | null, newInput: string): number {
  if (!currentTopic?.trim()) {
    return 0;
  }

  const topicSet = new Set(topicTokens(currentTopic));
  const inputTokens = topicTokens(newInput);
  if (inputTokens.length === 0) {
    return 0;
  }

  let hits = 0;
  for (const token of inputTokens) {
    if (topicSet.has(token)) {
      hits += 1;
    }
  }

  return hits / inputTokens.length;
}
