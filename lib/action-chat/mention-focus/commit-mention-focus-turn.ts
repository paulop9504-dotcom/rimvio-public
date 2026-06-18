import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildFocusConfirmWire,
  type InlineChatFocusWire,
} from "@/lib/action-chat/mention-focus/inline-chat-focus";
import { parseMentionTimerDuration } from "@/lib/action-chat/mention-timer/inline-chat-timer";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

const FOCUS_MENTION = /^@(집중|focus)(?:\s+(.*))?$/iu;

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

export function parseMentionFocusInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(FOCUS_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionFocusInput(text: string): boolean {
  return parseMentionFocusInput(text) !== null;
}

export function focusConfirmCopy(wire: InlineChatFocusWire): string {
  return `집중 **${wire.label}** 동안 카카오톡·이메일 알림을 모아둘까요?\n끝나면 한 번에 보여드려요.`;
}

/** Local @집중 turn — confirm → timer + notification absorb. */
export function tryBuildMentionFocusTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionFocusInput(input.text);
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
        "몇 시간·몇 분 집중할까요? 예: @집중 1시간, @집중 25분",
      ),
    ];
  }

  const durationMs = parseMentionTimerDuration(parsed.query);
  if (!durationMs) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "시간을 이렇게 적어주세요. 예: @집중 1시간, @집중 90분, @집중 25분",
      ),
    ];
  }

  const focusWire = buildFocusConfirmWire(durationMs);

  return [
    userMessage,
    createChatMessage("assistant", focusConfirmCopy(focusWire), {
      inlineChatFocus: focusWire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: "focus",
        sourceRef: "mention:focus",
      }),
    }),
  ];
}
