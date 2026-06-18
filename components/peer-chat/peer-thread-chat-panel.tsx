"use client";

import { ArrowUp, ImagePlus, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePeerThreadChat } from "@/hooks/use-peer-thread-chat";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { ExperienceDiscussionMessage } from "@/components/experience/experience-discussion-message";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { PeerInviteBanner } from "@/components/peer-chat/peer-invite-banner";
import { isDmThreadId } from "@/lib/peer-chat/dm-thread";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import {
  shouldShowPeerMessageTime,
  shouldShowPeerProfileHeader,
} from "@/lib/peer-chat/message-time-visibility";
import { groupReadCountForMessage } from "@/lib/peer-chat/group-read-receipt";
import { shouldShowPeerSentCheck } from "@/lib/peer-chat/peer-read-receipt";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { shouldAnalyzePeerAiLens } from "@/lib/context/peer-thread-policy";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { LensMapPickerSheet } from "@/components/peer-chat/lens-map-picker-sheet";
import { LensScheduleConfirmSheet } from "@/components/peer-chat/lens-schedule-confirm-sheet";
import { usePeerAiLens } from "@/hooks/use-peer-ai-lens";
import { useLensBubbleActions } from "@/hooks/use-lens-bubble-actions";
import { cn } from "@/lib/utils";

type PeerThreadChatPanelProps = {
  displayName: string;
  policyInput: PeerThreadPolicyInput;
  aiLensEnabled: boolean;
  readOnly?: boolean;
  showAiMentionLink?: boolean;
  peerAvatarUrl?: string | null;
  /** 카톡보다 단순한 1:1 DM UI */
  simpleDm?: boolean;
  /** Experience ROOM — no bubbles, no read receipts. */
  experienceDiscussion?: boolean;
};

export function PeerThreadChatPanel({
  displayName,
  policyInput,
  aiLensEnabled,
  readOnly = false,
  simpleDm = false,
  peerAvatarUrl = null,
  experienceDiscussion = false,
}: PeerThreadChatPanelProps) {
  const threadId = policyInput.settings.peerThreadId;
  const phoneDm = isDmThreadId(threadId);
  const isGroup = isGroupThreadId(threadId);
  const simple = simpleDm || phoneDm;
  const lensActive = !experienceDiscussion && shouldAnalyzePeerAiLens(policyInput);
  const { profile: peerProfileRemote } = useDmPeerProfile(
    threadId,
    phoneDm && isRegisteredPeerDmThread(threadId),
  );
  const peerProfile = {
    displayName:
      peerProfileRemote?.displayName?.trim() ||
      displayName.trim() ||
      "친구",
    avatarUrl: peerProfileRemote?.avatarUrl ?? peerAvatarUrl ?? null,
    rimvioId: peerProfileRemote?.rimvioId ?? null,
  };
  const {
    messages,
    canSend,
    send,
    inviteUrl,
    inviteCode,
    syncError,
    aiBusy,
    imageBusy,
    sendImage,
    canSendImage,
    messagesHydrating,
    peerLastReadAt,
    groupReadCursors,
  } = usePeerThreadChat(policyInput);
  const { candidatesByMessageId } = usePeerAiLens({
    messages,
    enabled: lensActive && !readOnly,
  });
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerBusy = aiBusy || imageBusy;
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const [messagesVisible, setMessagesVisible] = useState(false);
  const {
    handleLensSelect,
    mapPicker,
    setMapPicker,
    scheduleConfirm,
    setScheduleConfirm,
    handleScheduleSaved,
  } = useLensBubbleActions({ displayName, peerThreadId: threadId });

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || readOnly || !canSend || composerBusy) {
        return;
      }
      el.focus({ preventScroll: true });
    });
  }, [readOnly, canSend, composerBusy]);

  useEffect(() => {
    scrollBehaviorRef.current = "auto";
    setMessagesVisible(messages.length > 0);
  }, [threadId]);

  useEffect(() => {
    if (messagesHydrating && messages.length === 0) {
      return;
    }
    if (messages.length > 0 && !messagesHydrating && !messagesVisible) {
      requestAnimationFrame(() => setMessagesVisible(true));
    }
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({
        behavior: scrollBehaviorRef.current,
      });
      scrollBehaviorRef.current = "smooth";
    }
  }, [messages.length, aiBusy, messagesHydrating, threadId, messagesVisible]);

  const showSkeleton = messagesHydrating && messages.length === 0;
  const showEmptyHint =
    !messagesHydrating && messages.length === 0 && !showSkeleton;

  useEffect(() => {
    if (canSend && !readOnly) {
      focusComposer();
    }
  }, [canSend, readOnly, focusComposer]);

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, simple ? 96 : 128)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [text, resizeComposer]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || !canSend || readOnly || composerBusy) {
      return;
    }
    setText("");
    resizeComposer();
    focusComposer();
    void send(body, "me").then(() => focusComposer());
  }, [text, canSend, readOnly, composerBusy, send, focusComposer, resizeComposer]);

  const handleImageFile = useCallback(
    async (file: File | null) => {
      if (!file || !canSendImage || readOnly || composerBusy) {
        return;
      }
      const caption = text.trim();
      setText("");
      resizeComposer();
      const sent = await sendImage(file, caption || undefined);
      if (sent) {
        focusComposer();
      }
    },
    [
      canSendImage,
      readOnly,
      composerBusy,
      text,
      sendImage,
      resizeComposer,
      focusComposer,
    ],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const onLensSelect = (
    candidate: DeepLinkBubbleCandidate,
    sourceMessageId?: string,
  ) => {
    handleLensSelect(candidate, sourceMessageId);
  };

  const speakerNameFor = (author: PeerMessage["author"]) => {
    if (author === "me") {
      return "나";
    }
    if (author === "ai") {
      return "Rimvio";
    }
    return peerProfile.displayName;
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        experienceDiscussion || simple ? "bg-background" : "rimvio-dm-chat-bg",
      )}
    >
      {!experienceDiscussion && !readOnly && !phoneDm && !isGroup ? (
        <PeerInviteBanner inviteUrl={inviteUrl} inviteCode={inviteCode} />
      ) : null}

      {syncError ? (
        <p className="px-3 py-1.5 text-center text-[11px] text-amber-200/90">
          {normalizePeerSyncError(syncError)}
        </p>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          experienceDiscussion ? "px-0 py-0" : simple ? DM_CHAT.listPad : "px-4 py-4",
        )}
      >
        {showSkeleton ? (
          <DmChatMessageSkeleton />
        ) : showEmptyHint ? (
          <p
            className={cn(
              "text-center text-muted-foreground",
              experienceDiscussion || simple ? "py-8 text-sm" : "py-16 text-base",
            )}
          >
            {experienceDiscussion
              ? "이 경험에 대한 이야기를 남겨 보세요"
              : simple
                ? "메시지를 입력하세요"
                : `${displayName}와 대화해요`}
          </p>
        ) : experienceDiscussion ? (
          <ul
            className={cn(
              "divide-y divide-border rounded-xl border border-border bg-background mx-3 my-3",
              messagesHydrating
                ? "opacity-100"
                : cn(
                    "transition-opacity duration-200",
                    messagesVisible ? "opacity-100" : "opacity-0",
                  ),
            )}
          >
            {messages
              .filter((row) => row.author !== "ai" && row.body.trim().length > 0)
              .map((message) => (
                <ExperienceDiscussionMessage
                  key={message.id}
                  message={message}
                  speakerName={speakerNameFor(message.author)}
                />
              ))}
          </ul>
        ) : (
          <ul
            className={cn(
              "flex flex-col",
              simple ? DM_CHAT.listGap : "gap-3",
              messagesHydrating
                ? "opacity-100"
                : cn(
                    "transition-opacity duration-200",
                    messagesVisible ? "opacity-100" : "opacity-0",
                  ),
            )}
          >
            {messages.map((message, index) => (
              <PeerChatBubble
                key={message.id}
                message={message}
                simple={simple}
                showTime={shouldShowPeerMessageTime(messages, index)}
                showPeerProfileHeader={shouldShowPeerProfileHeader(
                  messages,
                  index,
                )}
                peerProfile={peerProfile}
                lensCandidates={candidatesByMessageId[message.id] ?? []}
                onLensSelect={(candidate) => onLensSelect(candidate, message.id)}
                lensDisabled={aiBusy}
                showSentCheck={
                  phoneDm &&
                  shouldShowPeerSentCheck(messages, index, peerLastReadAt)
                }
                groupReadCount={
                  isGroup
                    ? groupReadCountForMessage(messages, index, groupReadCursors)
                    : 0
                }
              />
            ))}
            {aiBusy ? (
              <li className="flex justify-end">
                <span
                  className={cn(
                    "rounded-full bg-muted text-muted-foreground",
                    simple ? "px-2 py-0.5 text-[12px]" : "px-3 py-2 text-[13px]",
                  )}
                >
                  …
                </span>
              </li>
            ) : null}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className={cn(
          "shrink-0 border-t",
          simple
            ? "border-border bg-card px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
            : "rimvio-dm-composer px-3 pb-3 pt-2",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className={cn("flex items-end", simple ? "gap-1.5" : "gap-2.5")}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              void handleImageFile(file);
            }}
          />
          {canSendImage && !readOnly ? (
            <button
              type="button"
              aria-label="사진 보내기"
              disabled={composerBusy}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => imageInputRef.current?.click()}
              className={cn(
                "mb-px flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30",
                simple ? DM_CHAT.sendSize : "size-11",
              )}
            >
              {imageBusy ? (
                <Loader2
                  className={cn(simple ? "size-4" : "size-5", "animate-spin")}
                  aria-hidden
                />
              ) : (
                <ImagePlus
                  className={cn(simple ? "size-5" : "size-6")}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </button>
          ) : null}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            disabled={!canSend || readOnly || composerBusy}
            placeholder={readOnly ? "읽기 전용" : "메시지"}
            className={cn(
              "flex-1 resize-none overflow-y-auto outline-none",
              simple
                ? cn(
                    DM_CHAT.composerMinH,
                    DM_CHAT.composerText,
                    DM_CHAT.composerPad,
                    "max-h-24 rounded-2xl border border-border bg-muted text-foreground placeholder:text-muted-foreground",
                  )
                : "max-h-32 min-h-[48px] rounded-xl bg-rimvio-surface-muted px-4 py-3 text-base",
            )}
          />
          <button
            type="button"
            disabled={!canSend || !text.trim() || composerBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void submit()}
            className={cn(
              "mb-px flex shrink-0 items-center justify-center rounded-full disabled:opacity-30",
              simple
                ? cn(DM_CHAT.sendSize, "bg-[#FEE500] text-[#191919]")
                : "rimvio-dm-send-btn size-11 text-white",
            )}
            aria-label="보내기"
          >
            {aiBusy ? (
              <Loader2
                className={cn(simple ? "size-4" : "size-5", "animate-spin")}
                aria-hidden
              />
            ) : (
              <ArrowUp
                className={cn(simple ? "size-4 stroke-[2.5]" : "size-6 stroke-[2.5]")}
                aria-hidden
              />
            )}
          </button>
        </form>
      </div>

      <LensMapPickerSheet
        open={mapPicker.open}
        place={mapPicker.place}
        onOpenChange={(open) =>
          setMapPicker((prev) => ({ ...prev, open, place: open ? prev.place : null }))
        }
      />
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
    </div>
  );
}
