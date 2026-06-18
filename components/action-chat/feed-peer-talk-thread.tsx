"use client";

import { FeedPeerTalkRoomBanner } from "@/components/peer-chat/feed-peer-talk-room-banner";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import {
  shouldShowPeerMessageTime,
  shouldShowPeerProfileHeader,
} from "@/lib/peer-chat/message-time-visibility";
import { usePeerAiLens } from "@/hooks/use-peer-ai-lens";
import { useLensBubbleActions } from "@/hooks/use-lens-bubble-actions";
import { LensScheduleConfirmSheet } from "@/components/peer-chat/lens-schedule-confirm-sheet";
import { usePeerThreadSettings } from "@/hooks/use-peer-thread-settings";
import { usePeerReadReceipt } from "@/hooks/use-peer-read-receipt";
import { shouldShowPeerSentCheck } from "@/lib/peer-chat/peer-read-receipt";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { resolveChatBubbleFocusTone } from "@/components/action-chat/chat-ambient-focus";
import type { ChatBubbleGroup } from "@/lib/ui/chat-bubble-group";
import { cn } from "@/lib/utils";

type FeedPeerTalkFeedRowsProps = {
  messageId: string;
  thread: FeedPeerTalkThreadWire;
  parentBubbleGroup: ChatBubbleGroup;
  messages: ActionChatMessage[];
  messageIndex: number;
  focusedTurnIds: Set<string>;
  composerLive: boolean;
};

function peerRowGroup(
  parent: ChatBubbleGroup,
  rowIndex: number,
): ChatBubbleGroup {
  if (rowIndex === 0) {
    return parent;
  }
  return parent === "single" || parent === "last" ? "last" : "middle";
}

function FeedPeerTalkRow({
  messageId,
  rowKey,
  thread,
  peerIndex,
  allPeerMessages,
  slice,
  parentBubbleGroup,
  rowIndex,
  focusedTurnIds,
  composerLive,
  peerProfile,
  lensCandidates = [],
  onLensSelect,
  lensDisabled = false,
  peerLastReadAt = null,
}: {
  messageId: string;
  rowKey: string;
  thread: FeedPeerTalkThreadWire;
  peerIndex: number;
  allPeerMessages: FeedPeerTalkThreadWire["messages"];
  slice: FeedPeerTalkThreadWire["messages"][number];
  parentBubbleGroup: ChatBubbleGroup;
  rowIndex: number;
  focusedTurnIds: Set<string>;
  composerLive: boolean;
  peerProfile: {
    displayName: string;
    avatarUrl: string | null;
    rimvioId: string | null;
  };
  lensCandidates?: readonly DeepLinkBubbleCandidate[];
  onLensSelect?: (candidate: DeepLinkBubbleCandidate) => void;
  lensDisabled?: boolean;
  peerLastReadAt?: string | null;
}) {
  const group = peerRowGroup(parentBubbleGroup, rowIndex);
  const focusTone = resolveChatBubbleFocusTone(
    messageId,
    focusedTurnIds,
    composerLive,
  );

  const bubbleRole = slice.author === "me" ? "user" : "assistant";

  return (
    <div
      key={rowKey}
      data-message-id={`${messageId}:${slice.id}`}
      data-feed-peer-talk-row={slice.id}
      className="chat-message-focus w-full max-w-full"
      data-bubble-focus={focusTone}
      data-bubble-group={group}
      data-bubble-role={bubbleRole}
    >
      <div className={cn("flex w-full max-w-full flex-col", DM_CHAT.listGap)}>
        <PeerChatBubble
          message={slice}
          simple
          as="div"
          showTime={shouldShowPeerMessageTime(allPeerMessages, peerIndex)}
          showPeerProfileHeader={shouldShowPeerProfileHeader(
            allPeerMessages,
            peerIndex,
          )}
          peerProfile={peerProfile}
          lensCandidates={lensCandidates}
          onLensSelect={onLensSelect}
          lensDisabled={lensDisabled}
          showSentCheck={
            isRegisteredPeerDmThread(thread.peerThreadId) &&
            shouldShowPeerSentCheck(allPeerMessages, peerIndex, peerLastReadAt)
          }
        />
      </div>
    </div>
  );
}

/** 피드 타임라인에 DM 말풍선을 그대로 펼침 — 테두리·내부 입력창 없음 */
export function FeedPeerTalkFeedRows({
  messageId,
  thread,
  parentBubbleGroup,
  messages,
  messageIndex,
  focusedTurnIds,
  composerLive,
}: FeedPeerTalkFeedRowsProps) {
  const showSkeleton = thread.hydrating && thread.messages.length === 0;
  const historyEnd = thread.historyEndIndex;
  const prior =
    historyEnd >= 0 ? thread.messages.slice(0, historyEnd + 1) : thread.messages;
  const fresh = historyEnd >= 0 ? thread.messages.slice(historyEnd + 1) : [];

  if (showSkeleton) {
    return (
      <div
        data-message-id={messageId}
        className="chat-message-focus w-full py-1"
        data-bubble-role="assistant"
      >
        <DmChatMessageSkeleton />
      </div>
    );
  }

  if (thread.messages.length === 0) {
    return (
      <div
        data-message-id={messageId}
        className="chat-message-focus w-full py-3 text-center text-[11px] text-muted-foreground"
        data-bubble-role="assistant"
      >
        - {thread.promptLine} -
      </div>
    );
  }

  let rowIndex = 0;

  const phoneDm = isRegisteredPeerDmThread(thread.peerThreadId);
  const { profile } = useDmPeerProfile(thread.peerThreadId, phoneDm);
  const peerProfile = {
    displayName:
      profile?.displayName?.trim() || thread.displayName.trim() || "친구",
    avatarUrl: profile?.avatarUrl ?? null,
    rimvioId: profile?.rimvioId ?? null,
  };

  const { settings, setAiLens } = usePeerThreadSettings({
    peerThreadId: thread.peerThreadId,
    displayName: thread.displayName,
  });
  const lensEnabled = settings.aiLensEnabled && !thread.closed;
  const { peerLastReadAt: polledReadAt } = usePeerReadReceipt(
    thread.peerThreadId,
    phoneDm && !thread.closed,
  );
  const peerLastReadAt = polledReadAt ?? thread.peerLastReadAt ?? null;
  const { candidatesByMessageId } = usePeerAiLens({
    messages: thread.messages,
    enabled: lensEnabled,
  });
  const {
    handleLensSelect,
    scheduleConfirm,
    setScheduleConfirm,
    handleScheduleSaved,
  } = useLensBubbleActions({
    displayName: thread.displayName,
    peerThreadId: thread.peerThreadId,
  });

  const rowLensProps = (sliceId: string) => ({
    lensCandidates: candidatesByMessageId[sliceId] ?? [],
    onLensSelect: (candidate: DeepLinkBubbleCandidate) =>
      handleLensSelect(candidate, sliceId),
    lensDisabled: !lensEnabled,
  });

  return (
    <>
      <div data-message-id={messageId} className="chat-message-focus w-full px-0.5 pb-1">
        <FeedPeerTalkRoomBanner
          peerThreadId={thread.peerThreadId}
          displayName={thread.displayName}
          aiLensEnabled={settings.aiLensEnabled}
          onAiLensChange={setAiLens}
        />
      </div>
      {prior.map((slice, i) => (
        <FeedPeerTalkRow
          key={`${messageId}-prior-${slice.id}`}
          messageId={messageId}
          rowKey={`${messageId}-prior-${slice.id}`}
          thread={thread}
          peerIndex={i}
          allPeerMessages={thread.messages}
          slice={slice}
          parentBubbleGroup={parentBubbleGroup}
          rowIndex={rowIndex++}
          focusedTurnIds={focusedTurnIds}
          composerLive={composerLive}
          peerProfile={peerProfile}
          peerLastReadAt={peerLastReadAt}
          {...rowLensProps(slice.id)}
        />
      ))}
      <div
        data-message-id={messageId}
        className={cn(
          "chat-message-focus w-full py-2 text-center text-[11px]",
          thread.closed ? "text-muted-foreground/60" : "text-muted-foreground",
        )}
        data-bubble-role="assistant"
      >
        - {thread.promptLine} -
      </div>
      {fresh.map((slice, i) => (
        <FeedPeerTalkRow
          key={`${messageId}-fresh-${slice.id}`}
          messageId={messageId}
          rowKey={`${messageId}-fresh-${slice.id}`}
          thread={thread}
          peerIndex={prior.length + i}
          allPeerMessages={thread.messages}
          slice={slice}
          parentBubbleGroup={parentBubbleGroup}
          rowIndex={rowIndex++}
          focusedTurnIds={focusedTurnIds}
          composerLive={composerLive}
          peerProfile={peerProfile}
          peerLastReadAt={peerLastReadAt}
          {...rowLensProps(slice.id)}
        />
      ))}
      <LensScheduleConfirmSheet
        open={scheduleConfirm.open}
        draft={scheduleConfirm.draft}
        onOpenChange={(open) =>
          setScheduleConfirm((prev) => ({
            open,
            draft: open ? prev.draft : null,
          }))
        }
        onSaved={handleScheduleSaved}
      />
    </>
  );
}
