import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  buildEndFeedPeerTalkAssistantText,
  endFeedPeerTalkInFeed,
} from "@/lib/action-chat/feed-peer-talk/end-feed-peer-talk";
import { getFeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

const END_PEER_TALK_MENTION =
  /^@(대화끝|톡끝|톡종료|대화종료|피드복귀|talkend|endtalk)(?:\s|$)/iu;

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

export function isEndPeerTalkMentionInput(raw: string): boolean {
  return END_PEER_TALK_MENTION.test(normalizeAtMentionInput(raw).trim());
}

export type EndPeerTalkTurnDeps = {
  readMessages: () => ActionChatMessage[];
  persist: (next: ActionChatMessage[]) => void;
};

/** @대화끝 — 피드 DM composer 종료, AI 피드로 복귀 */
export function tryBuildMentionEndPeerTalkTurn(
  input: {
    text: string;
    chatAxis?: ChatAxis;
  },
  deps: EndPeerTalkTurnDeps,
): ActionChatMessage[] | null {
  if (!isEndPeerTalkMentionInput(input.text)) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  const hadSurface = deps.readMessages().some(
    (message) =>
      message.feedPeerTalkThread ||
      Boolean(getFeedPeerTalkSession()),
  );
  const result = endFeedPeerTalkInFeed(deps);

  if (!result.ended && !hadSurface) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "지금 열려 있는 피드 톡이 없어요. 이미 AI 피드예요.",
      ),
    ];
  }

  return [
    userMessage,
    createChatMessage(
      "assistant",
      buildEndFeedPeerTalkAssistantText(result.displayName),
    ),
  ];
}
