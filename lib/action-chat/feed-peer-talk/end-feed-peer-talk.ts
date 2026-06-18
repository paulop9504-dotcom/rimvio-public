import { isFeedTalkInlineFeature } from "@/lib/action-chat/feed-peer-talk/feed-talk-inline-features";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  clearFeedPeerTalkSession,
  getFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import { resolveFeedPeerTalkSessionFromMessages } from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";

export type EndFeedPeerTalkResult = {
  ended: boolean;
  displayName: string | null;
};

const PEER_TALK_USER_MENTION = /^@톡(?:\s|$)/iu;
const GROUP_TALK_USER_MENTION = /^@(?:단톡|그룹|group)(?:\s|$)/iu;

/** 피드 톡 UI·@톡 칩·DM 말풍선 블록을 피드 타임라인에서 제거 */
export function stripFeedPeerTalkSurfaceFromMessages(
  messages: ActionChatMessage[],
): ActionChatMessage[] {
  return messages.filter((message) => {
    if (message.feedPeerTalkThread) {
      return false;
    }
    if (
      message.role === "assistant" &&
      isFeedTalkInlineFeature(message.inlineChatAction?.featureId ?? "")
    ) {
      return false;
    }
    if (
      message.role === "user" &&
      (PEER_TALK_USER_MENTION.test(message.text.trim()) ||
        GROUP_TALK_USER_MENTION.test(message.text.trim()))
    ) {
      return false;
    }
    return true;
  });
}

function hasFeedPeerTalkSurface(messages: ActionChatMessage[]): boolean {
  return messages.some(
    (message) =>
      message.feedPeerTalkThread ||
      (message.role === "assistant" &&
        isFeedTalkInlineFeature(message.inlineChatAction?.featureId ?? "")),
  );
}

/** @톡 다른 친구 시작 전 — 이전 피드 톡 흔적 제거 */
export function wipeFeedPeerTalkSurfaceIfNeeded(
  deps: {
    readMessages: () => ActionChatMessage[];
    persist: (next: ActionChatMessage[]) => void;
  },
  nextPeerThreadId: string,
): { wiped: boolean; previousDisplayName: string | null } {
  const messages = deps.readMessages();
  const session =
    getFeedPeerTalkSession() ?? resolveFeedPeerTalkSessionFromMessages(messages);
  const surface = hasFeedPeerTalkSurface(messages);
  const switching =
    Boolean(session) && session!.peerThreadId !== nextPeerThreadId;

  if (!surface && !session) {
    return { wiped: false, previousDisplayName: null };
  }

  if (!surface && session?.peerThreadId === nextPeerThreadId) {
    return { wiped: false, previousDisplayName: null };
  }

  const previousDisplayName = switching ? session!.displayName : null;
  clearFeedPeerTalkSession();
  deps.persist(stripFeedPeerTalkSurfaceFromMessages(deps.readMessages()));

  return { wiped: true, previousDisplayName };
}

export function endFeedPeerTalkInFeed(deps: {
  readMessages: () => ActionChatMessage[];
  persist: (next: ActionChatMessage[]) => void;
}): EndFeedPeerTalkResult {
  const session =
    getFeedPeerTalkSession() ??
    resolveFeedPeerTalkSessionFromMessages(deps.readMessages());

  const surface = hasFeedPeerTalkSurface(deps.readMessages());

  if (!session && !surface) {
    clearFeedPeerTalkSession();
    return { ended: false, displayName: null };
  }

  const displayName = session?.displayName ?? null;
  clearFeedPeerTalkSession();
  deps.persist(stripFeedPeerTalkSurfaceFromMessages(deps.readMessages()));

  return { ended: true, displayName };
}

export function buildEndFeedPeerTalkAssistantText(displayName: string | null): string {
  if (displayName?.trim()) {
    return `${displayName.trim()}님과의 피드 톡을 마쳤어요. 이제 AI 피드예요 — 무엇을 도와드릴까요?`;
  }
  return "피드 톡을 마쳤어요. 이제 AI 피드예요 — 무엇을 도와드릴까요?";
}

export function buildSwitchFeedPeerTalkToast(
  previousName: string,
  nextName: string,
): string {
  return `${previousName}님 피드 톡을 마치고 ${nextName}님과 이어요 · 실행은 친구 ROOM에서`;
}
