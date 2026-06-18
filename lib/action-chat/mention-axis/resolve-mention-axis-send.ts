import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  readStoredChatAxis,
  writeStoredChatAxis,
} from "@/lib/action-chat/chat-three-axis";
import {
  axisHintCopy,
  parseMentionAxisInput,
} from "@/lib/action-chat/mention-axis/parse-mention-axis";

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

export type MentionAxisSendContext = {
  chatAxis: ChatAxis;
  orchestrateMessageOverride: string | null;
  hintTurn: ActionChatMessage[] | null;
};

/** @고민 / @밥 / @일정 — axis command (same engine as former tabs). */
export function resolveMentionAxisSendContext(
  trimmed: string,
  optionsChatAxis?: ChatAxis,
): MentionAxisSendContext {
  const parsed = parseMentionAxisInput(trimmed);
  if (!parsed) {
    return {
      chatAxis: optionsChatAxis ?? readStoredChatAxis(),
      orchestrateMessageOverride: null,
      hintTurn: null,
    };
  }

  writeStoredChatAxis(parsed.chatAxis);

  if (!parsed.query) {
    const userMessage = createChatMessage("user", parsed.rawInput, {
      chatAxis: parsed.chatAxis,
    });
    return {
      chatAxis: parsed.chatAxis,
      orchestrateMessageOverride: null,
      hintTurn: [
        userMessage,
        createChatMessage("assistant", axisHintCopy(parsed.chatAxis), {
          chatAxis: parsed.chatAxis,
          metadata: mentionOrchestratorMetadata({
            mention_feature: "chat_axis",
            chat_axis: parsed.chatAxis,
            sourceRef: `mention:axis:${parsed.chatAxis}`,
          }),
        }),
      ],
    };
  }

  return {
    chatAxis: parsed.chatAxis,
    orchestrateMessageOverride: parsed.query,
    hintTurn: null,
  };
}
