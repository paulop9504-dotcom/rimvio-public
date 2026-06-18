import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatReminderWire,
} from "@/lib/action-chat/mention-reminder/inline-chat-reminder";
import {
  DEFAULT_MENTION_REMINDER_DELAY_MS,
  formatMentionReminderWhen,
  parseMentionReminderQuery,
} from "@/lib/action-chat/mention-reminder/parse-mention-reminder-query";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import {
  requestReminderPermission,
  scheduleLinkReminderAt,
} from "@/lib/local-links/reminders";

const REMINDER_MENTION = /^@(알림|reminder|리마인더)(?:\s+(.*))?$/iu;

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

export function parseMentionReminderInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(REMINDER_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionReminderInput(text: string): boolean {
  return parseMentionReminderInput(text) !== null;
}

/** Local @알림 turn — link-reminder ingest, no orchestrator. */
export function tryBuildMentionReminderTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  activeLink?: { id: string; title: string; original_url: string } | null;
  referenceDate?: string;
}): ActionChatMessage[] | null {
  const parsed = parseMentionReminderInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  if (!parsed.query) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "언제 알려드릴까요? 예: @알림 내일 9시, @알림 30분 뒤",
      ),
    ];
  }

  const referenceDate =
    input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const { title: parsedTitle, fireAtIso } = parseMentionReminderQuery(
    parsed.query,
    referenceDate,
  );

  const linkId = input.activeLink?.id ?? `mention-${crypto.randomUUID().slice(0, 8)}`;
  const url = input.activeLink?.original_url ?? "rimvio://chat/reminder";
  const title =
    parsedTitle ||
    input.activeLink?.title?.trim() ||
    parsed.query.trim() ||
    "알림";

  const fireAt =
    fireAtIso ??
    new Date(Date.now() + DEFAULT_MENTION_REMINDER_DELAY_MS).toISOString();

  void requestReminderPermission();
  const reminder = scheduleLinkReminderAt({
    linkId,
    title,
    url,
    fireAt,
  });

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatReminder: buildInlineChatReminderWire({
        reminderId: reminder.id,
        linkId: reminder.linkId,
        title: reminder.title,
        url: reminder.url,
        fireAt: reminder.fireAt,
        whenLabel: formatMentionReminderWhen(reminder.fireAt),
      }),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "reminder",
        sourceRef: "mention:reminder",
      }),
    }),
  ];
}
