import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { saveConversationMemory } from "@/lib/conversation-memory/conversation-memory-store";
import { summarizeChatSession } from "@/lib/conversation-memory/summarize-session";
import {
  clearActionChatMessages,
  readActionChatMessages,
  writeActionChatMessages,
} from "@/lib/action-chat/chat-store";

export type ArchiveSessionResult = {
  archived: boolean;
  topic?: string;
  summary?: string;
};

/** Archive current session to memory store, then clear UI messages. */
export function archiveAndClearChatSession(scopeId: string): ArchiveSessionResult {
  const messages = readActionChatMessages(scopeId);
  const draft = summarizeChatSession(messages);

  if (draft) {
    saveConversationMemory(draft);
  }

  clearActionChatMessages(scopeId);

  return {
    archived: Boolean(draft),
    topic: draft?.topic,
    summary: draft?.summary,
  };
}

export function peekSessionSummary(
  messages: ActionChatMessage[]
): ReturnType<typeof summarizeChatSession> {
  return summarizeChatSession(messages);
}

export function replaceActionChatMessages(
  scopeId: string,
  messages: ActionChatMessage[]
) {
  writeActionChatMessages(scopeId, messages);
}
