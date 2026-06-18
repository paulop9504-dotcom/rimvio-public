import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  memoriesFromWire,
  searchConversationMemories,
} from "@/lib/conversation-memory/conversation-memory-store";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";

const RECALL_COMMAND =
  /(?:아까|방금|그때|전에|이전|다시|가져|불러|꺼내|불러와|가져와|기억|뭐\s*였|뭐더라|얘기(?:하)?(?:던|한)\s*거)/u;

export function isConversationRecallQuery(message: string): boolean {
  return RECALL_COMMAND.test(message.trim());
}

function extractRecallQuery(message: string): string {
  return message
    .replace(
      /(?:아까|방금|그때|전에|이전|다시|가져|불러|꺼내|불러와|가져와|기억|뭐\s*였|뭐더라|얘기(?:하)?(?:던|한)\s*거|관련|해서|나누던|하던)/gu,
      " "
    )
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stage 3 recall — conversation memory store (not calendar). */
export function orchestrateConversationRecall(input: {
  message: string;
  memories?: ConversationMemoryWire[];
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !isConversationRecallQuery(message)) {
    return null;
  }

  const pool = memoriesFromWire(input.memories);
  const query = extractRecallQuery(message);
  const hits = searchConversationMemories({
    query: query.length >= 2 ? query : message,
    limit: 3,
    records: pool,
  });

  if (hits.length === 0) {
    return {
      summary:
        "저장된 대화 기억을 찾지 못했어요. 키워드(예: 치과, 예약)를 조금 더 알려주시면 다시 찾아볼게요.",
      actions: [],
      source: "rules",
      confidence: 0.7,
      disclosure: "high",
      actionsRevealed: true,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      thought: "ConversationRecall · miss",
    };
  }

  const top = hits[0]!;
  const when = new Date(top.createdAt).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    summary: `네, **${top.topic}** 관련해서 나누던 내용이에요. (${when})\n${top.summary}`,
    actions: hits.slice(0, 2).map((item, index) => ({
      id: `conversation-recall-${index}`,
      label: item.topic.slice(0, 24),
      kind: "custom",
      payload: {
        conversationRecall: true,
        topic: item.topic,
        summary: item.summary,
      },
    })),
    source: "rules",
    confidence: 0.93,
    disclosure: "high",
    actionsRevealed: true,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    thought: `ConversationRecall · hit=${top.topic}`,
  };
}
