import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { ConversationMemoryRecord } from "@/lib/conversation-memory/types";

const TOPIC_STOP =
  /(?:아까|방금|그거|가져|불러|알려|줘|해줘|일정|잡|등록|확인|please|thanks)/gi;

const DOMAIN_TERMS =
  /(?:치과|병원|미용|헤어|미팅|회의|약속|예약|점심|저녁|식사|운동|수업|강의|면접|여행|프로젝트|납품)/gu;

function meaningfulTurns(messages: ActionChatMessage[]) {
  return messages.filter(
    (message) =>
      message.text.trim().length >= 2 &&
      !message.loading &&
      (message.role === "user" || message.summary || message.text)
  );
}

function extractTopic(messages: ActionChatMessage[]): string {
  const userLines = messages
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => message.text.trim());

  for (const line of userLines.reverse()) {
    for (const match of line.matchAll(DOMAIN_TERMS)) {
      const term = match[0]?.trim();
      if (term) {
        const context = line
          .replace(TOPIC_STOP, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 40);
        return context.length >= 4 ? context : `${term} 관련`;
      }
    }
  }

  const fallback = userLines[userLines.length - 1]
    ?.replace(TOPIC_STOP, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (fallback || "최근 대화").slice(0, 48);
}

function extractKeywords(topic: string, messages: ActionChatMessage[]): string[] {
  const terms = new Set<string>();

  for (const match of topic.matchAll(DOMAIN_TERMS)) {
    if (match[0]) {
      terms.add(match[0]);
    }
  }

  for (const message of messages.slice(-8)) {
    const text = `${message.text} ${message.summary ?? ""}`;
    for (const match of text.matchAll(DOMAIN_TERMS)) {
      if (match[0]) {
        terms.add(match[0]);
      }
    }
  }

  return [...terms].slice(0, 8);
}

function buildSummary(messages: ActionChatMessage[]): string {
  const assistantSummaries = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.summary?.trim() || message.text.trim())
    .filter(Boolean)
    .slice(-3);

  const userDecisions = messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.text.trim())
    .filter((line) => /(?:확정|저장|예약|일정|OK|ㅇㅋ|진행|그렇게)/iu.test(line));

  const parts = [
    ...assistantSummaries,
    ...userDecisions.map((line) => `사용자: ${line.slice(0, 60)}`),
  ].filter(Boolean);

  const joined = parts.join(" · ").slice(0, 280);
  return joined || "최근 대화 요약";
}

/** Rules-first session summary — no LLM required for archive. */
export function summarizeChatSession(
  messages: ActionChatMessage[]
): Omit<ConversationMemoryRecord, "id" | "createdAt"> | null {
  const turns = meaningfulTurns(messages);
  if (turns.length < 2) {
    return null;
  }

  const topic = extractTopic(turns);
  const summary = buildSummary(turns);
  const keywords = extractKeywords(topic, turns);

  return {
    topic,
    summary,
    keywords,
    messageCount: turns.length,
  };
}
