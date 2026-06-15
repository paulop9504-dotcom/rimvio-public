import { orchestrateUserMessage } from "@/lib/action-chat/orchestrate-user-message";
import type { AiMessagePayload } from "@/lib/chat-room/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

export function buildPeerComposerContext(peerDisplayName: string) {
  return `1:1 대화 상대: ${peerDisplayName}. Rimvio 채팅방 맥락.`;
}

export function peerHistoryForOrchestrator(
  messages: PeerMessage[],
  limit = 12,
): Array<{ role: "user" | "assistant"; content: string }> {
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const message of messages.slice(-limit)) {
    if (message.messageType === "ai_private" || message.messageType === "ai_shared") {
      history.push({
        role: "assistant",
        content: message.aiPayload?.summary ?? message.body,
      });
      continue;
    }
    if (message.author === "me") {
      history.push({ role: "user", content: message.body });
    } else if (message.messageType === "human") {
      history.push({ role: "user", content: `${message.body}` });
    }
  }

  return history;
}

export async function orchestratePeerRoomAi(input: {
  prompt: string;
  peerDisplayName: string;
  messages: PeerMessage[];
}): Promise<{ body: string; payload: AiMessagePayload }> {
  const result = await orchestrateUserMessage({
    message: input.prompt,
    composerContext: buildPeerComposerContext(input.peerDisplayName),
    history: peerHistoryForOrchestrator(input.messages),
  });

  const actions =
    result.actions?.slice(0, 6).map((action) => ({
      id: action.id,
      label: action.label,
      href: action.href,
    })) ?? [];

  const summary = result.summary?.trim() || "응답을 준비하지 못했어요.";
  const body = actions.length
    ? `${summary}\n\n${actions.map((a) => `· ${a.label}`).join("\n")}`
    : summary;

  return {
    body,
    payload: {
      summary,
      actions,
      prompt: input.prompt,
    },
  };
}
