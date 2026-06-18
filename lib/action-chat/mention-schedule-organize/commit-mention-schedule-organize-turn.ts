import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatScheduleOrganizeWire,
} from "@/lib/action-chat/mention-schedule-organize/inline-chat-schedule-organize";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

const SCHEDULE_ORGANIZE_MENTION =
  /^@(일정정리|schedule-organize)(?:\s+(.*))?$/iu;

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

export function parseMentionScheduleOrganizeInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(SCHEDULE_ORGANIZE_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionScheduleOrganizeInput(text: string): boolean {
  return parseMentionScheduleOrganizeInput(text) !== null;
}

/** Local @일정정리 turn — read calendar + inline organize chip, no orchestrator. */
export function tryBuildMentionScheduleOrganizeTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionScheduleOrganizeInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatScheduleOrganize: buildInlineChatScheduleOrganizeWire(parsed.query),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "schedule",
        sourceRef: "mention:schedule",
      }),
    }),
  ];
}
