import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatTimerWire,
  parseMentionTimerDuration,
} from "@/lib/action-chat/mention-timer/inline-chat-timer";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";

const TIMER_MENTION = /^@(타이머|timer)(?:\s+(.*))?$/iu;

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

export function parseMentionTimerInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(TIMER_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

/** Local @타이머 turn — no orchestrator. Returns null when not a timer mention. */
export function tryBuildMentionTimerTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionTimerInput(input.text);
  if (!parsed) {
    return null;
  }

  const feature = resolveMentionFeature("타이머");
  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });
  const durationMs = parseMentionTimerDuration(parsed.query);

  if (!durationMs) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        feature?.confirmCopy ?? "몇 분 타이머를 돌릴까요? 예: @타이머 5분",
      ),
    ];
  }

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatTimer: buildInlineChatTimerWire(durationMs),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "timer",
        sourceRef: feature?.sourceRef ?? "mention:timer",
      }),
    }),
  ];
}

export function isMentionTimerInput(text: string): boolean {
  return parseMentionTimerInput(text) !== null;
}
