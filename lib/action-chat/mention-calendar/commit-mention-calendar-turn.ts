import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatCalendarWire,
  type InlineChatCalendarWire,
} from "@/lib/action-chat/mention-calendar/inline-chat-calendar";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

const CALENDAR_MENTION = /^@(캘린더|calendar)(?:\s+(.*))?$/iu;

function createChatMessage(
  role: ActionChatMessage["role"],
  text: string,
  extra?: Partial<ActionChatMessage>,
): ActionChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export function parseMentionCalendarInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(CALENDAR_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionCalendarInput(text: string): boolean {
  return parseMentionCalendarInput(text) !== null;
}

/** Local @캘린더 turn — no orchestrator. Returns null when not a calendar mention. */
export function tryBuildMentionCalendarTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionCalendarInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  const wire: InlineChatCalendarWire = buildInlineChatCalendarWire(parsed.query);

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatCalendar: wire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: "calendar",
        sourceRef: "mention:calendar",
      }),
    }),
  ];
}
