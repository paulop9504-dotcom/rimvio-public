"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderGit2, Settings2 } from "lucide-react";
import { CalendarFullScreenPanel } from "@/components/calendar/calendar-full-screen-panel";
import { CalendarHeaderControls } from "@/components/calendar/calendar-header-controls";
import {
  ActionDatePickerSheet,
} from "@/components/action-chat/action-date-picker-sheet";
import { OcrReviewDatePickerSheet } from "@/components/action-chat/ocr-review-date-picker-sheet";
import { ResourcePoolSheet } from "@/components/action-chat/resource-pool-sheet";
import { RelationshipFeedFolder } from "@/components/feed/relationship-feed-folder";
import {
  GoogleSheetsEmbedSheet,
  type GoogleSheetsEmbedTarget,
} from "@/components/action-chat/google-sheets-embed-sheet";
import { subscribeOpenGoogleSheet } from "@/lib/integrations/google-sheets-open-event";
import { ActiveActionsSheet } from "@/components/action-chat/active-actions-sheet";
import { ActionChatInputBar } from "@/components/action-chat/input-bar";
import { SearchIngressPanel } from "@/components/search/search-ingress-panel";
import { SearchRelatedContextPanel } from "@/components/search/search-related-context-panel";
import { SearchExperienceRunBanner } from "@/components/search/search-experience-run-banner";
import { classifySearchComposerIntent } from "@/lib/search/classify-search-composer-intent";
import type { RelatedContextSearchResult } from "@/lib/search/search-related-context-by-axis";
import {
  buildExperienceMentionComposerText,
  resolveExperienceRunFeatureLabel,
  type SearchExperienceExecution,
} from "@/lib/feed/feed-experience-run-mentions";
import { isFeedPeerTalkSendActive } from "@/lib/action-chat/feed-peer-talk/is-feed-peer-talk-send-active";
import {
  ChatAmbientFocusProvider,
  ChatAmbientShell,
} from "@/components/action-chat/chat-ambient-focus";
import { ActionChatLinkPanel } from "@/components/action-chat/link-panel";
import { ActionChatMessageList } from "@/components/action-chat/message-list";
import { ExecutionTimeline } from "@/components/threadline/execution-timeline";
import { TodayThread } from "@/components/threadline/today-thread";
import { threadlineHeaderStatus } from "@/lib/threadline";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useActionChat } from "@/hooks/use-action-chat";
import { usePredictiveDock } from "@/hooks/use-predictive-dock";
import { useRealtimeSurfaceComposition } from "@/hooks/use-realtime-surface-composition";
import { useSurfaceIgnoreObserver } from "@/hooks/use-surface-ignore-observer";
import { useSurfaceMemory } from "@/hooks/use-surface-memory";
import { useSynapticSnapshot } from "@/hooks/use-synaptic-snapshot";
import { SurfaceStabilityStrip } from "@/components/surface-composition/surface-stability-strip";
import { deriveLoopContextKo } from "@/lib/surface-composition/loop-why-copy";
import { useSurfaceTransientHint } from "@/hooks/use-surface-transient-hint";
import { useCapabilityDispatch } from "@/hooks/use-capability-dispatch";
import { routeRimvioPromptUri } from "@/lib/action-chat/rimvio-prompt-router";
import { buildSurfaceActionKey } from "@/lib/memory";
import {
  deriveSurfaceWhyLineKo,
  hasActiveDecisionStream,
  shouldRenderLatentSuggestionLayers,
} from "@/lib/surface-composition";
import {
  derivePrimaryErrorMessage,
  derivePrimarySuccessMessage,
} from "@/lib/surface-composition/surface-success-copy";
import { useSurfaceActionFeedback } from "@/hooks/use-surface-action-feedback";
import { FeedSlotStage } from "@/components/feed/feed-slot-stage";
import type { SurfaceCompositionRuntimeProps } from "@/components/surface-composition/surface-composition-runtime";
import { markOpportunityConsumed } from "@/lib/predictive-dock/action-opportunity-session";
import { recordDockActionUsage } from "@/lib/action-registry/record-dock-usage";
import { wireEventCompleted } from "@/lib/events/event-lifecycle-hooks";
import { normalizeAnchorId } from "@/lib/events/normalize-anchor-id";
import { executeDockActionWire } from "@/lib/action-os/execute-dock-action-wire";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import { useLinkReminderMap } from "@/hooks/use-link-reminders";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import {
  notifyPeerRoomFromFeed,
  peerRoomPath,
} from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { useActionCalendar } from "@/hooks/use-action-calendar";
import { useResourcePool } from "@/hooks/use-resource-pool";
import {
  buildFireAtFromDateTime,
  demoteLinkFromActionStream,
  promoteLinkToActionStream,
} from "@/lib/dual-mode/link-lifecycle";
import { useLinkContextChain } from "@/hooks/use-link-context-chain";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import { useCalendarSurfaceQuery } from "@/hooks/use-calendar-surface-query";
import {
  feedThreadScrollBehavior,
  isThreadNearBottom,
  scrollThreadToBottom,
} from "@/lib/feed/feed-thread-scroll";
import type { LocateActionResult } from "@/lib/locate/types";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { ActionChatScopeKind } from "@/lib/action-chat/chat-store";
import type { LinkRow } from "@/types/database";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";
import { PredictiveActionDock } from "@/components/action-chat/predictive-action-dock";
import { buildUserExplainabilityKoLine } from "@/lib/event-os/ui-binding/build-user-explainability-ko";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ActionChatFeedVariant = "slot" | "conversation";

type ActionChatFeedProps = {
  /** slot = 피드 HQ 카드만 · conversation = 검색 탭 수집 허브 (AI는 @ 또는 피드 경험 안) */
  variant?: ActionChatFeedVariant;
  scopeKind?: ActionChatScopeKind;
  links: LinkRow[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  contextRemote?: ContextRemoteState | null;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
  onOpenLinkPaste: () => void;
  onOpenCapture?: () => void;
  onQuickCapture?: (file: File) => void;
  /** 검색 탭 — 텍스트·링크·메모를 Feed Event에 귀속 */
  onSearchMemoIngest?: (text: string) => Promise<boolean>;
  searchIngesting?: boolean;
  searchIngressHint?: string;
  /** Feed → Search @ execution with experience context. */
  searchExecution?: SearchExperienceExecution | null;
  /** Search tab — find related Experience nodes (peer · place · trip). */
  relatedContextSearch?: {
    active: boolean;
    result: RelatedContextSearchResult | null;
    onSearch: (query: string) => RelatedContextSearchResult | null;
    onClear: () => void;
  } | null;
  className?: string;
};

export function ActionChatFeed({
  variant = "slot",
  scopeKind,
  links,
  activeIndex,
  onSelectIndex,
  contextRemote = null,
  locateResult = null,
  locateLoading = false,
  onOpenLinkPaste,
  onOpenCapture,
  onQuickCapture,
  onSearchMemoIngest,
  searchIngesting = false,
  searchIngressHint,
  searchExecution = null,
  relatedContextSearch = null,
  className,
}: ActionChatFeedProps) {
  const copy = useCopy();
  const locale = useAppLocale();
  const router = useRouter();
  const isSlot = variant === "slot";
  const isConversation = variant === "conversation";
  const isSearchMentionRun = Boolean(
    isConversation && scopeKind === "search" && searchExecution,
  );
  const isSearchContextBrowse = Boolean(
    isConversation && scopeKind === "search" && relatedContextSearch?.active,
  );
  const mentionComposerPrefill = useMemo(
    () =>
      searchExecution
        ? buildExperienceMentionComposerText({
            featureId: searchExecution.featureId,
            place: searchExecution.place,
          })
        : undefined,
    [searchExecution],
  );
  const { slots: relationshipSlots } = useRelationshipFeedSlots(isSlot);
  const activeLink = activeIndex >= 0 ? links[activeIndex] ?? null : null;
  const {
    chainedLinks,
    selectLink,
    clearChain,
  } = useLinkContextChain(links);
  const threadRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    sending,
    sendMessage,
    sendComposerPayload,
    submitHitRunFeedback,
    revealMessageActions,
    revealAlternateMessageActions,
    datePickerRequest,
    threadlineCards,
    deferredCards,
    handleThreadlineResolveChip,
    restoreThreadlineDeferred,
    confirmDatePicker,
    confirmOcrReviewDates,
    dismissDatePicker,
    confirmPlace,
    correctPlace,
    selectArea,
    chatScopeId,
    resumeConfirmInterrupt,
    dismissConfirmForInterrupt,
    handleWittyAction,
    cancelScheduledAction,
    triggerScheduledActionNow,
    executeTimeChoice,
    handleStudyAuxAction,
    togglePackingItem,
    startFreshConversation,
    feedPeerTalkSession,
    startFeedPeerTalk,
    sendFeedPeerTalk,
    completeInlineTimer,
    confirmInlineFocus,
    cancelInlineFocus,
    completeInlineFocus,
    handleFocusHeldInAppAction,
    eventOsProofRender,
    eventOsLastProof,
  } = useActionChat(activeLink, chainedLinks, {
    scopeKind:
      scopeKind ??
      (isConversation ? "search" : activeLink ? "link" : "free"),
  });
  // Search ingress is empty-state only — @ commands and chat replies must show the thread.
  const hasSearchChatThread =
    isConversation && scopeKind === "search" && (messages.length > 0 || sending);
  const isSearchIngress =
    isConversation &&
    scopeKind === "search" &&
    !isSearchMentionRun &&
    !isSearchContextBrowse &&
    !hasSearchChatThread;
  const reminderMap = useLinkReminderMap();
  const linkIds = useMemo(() => links.map((link) => link.id), [links]);
  const {
    badgeCount,
    prepSurface,
    nextAction,
    ...calendarForSheet
  } = useActionCalendar({
    messages,
    linkIds,
    refreshKey: reminderMap,
  });
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), [messages]);
  const surfaceMemory = useSurfaceMemory();
  const synaptic = useSynapticSnapshot();
  const surfaceState = useRealtimeSurfaceComposition({
    dateKey: masterContext.currentDate,
    context: {
      now: new Date(),
      completedActionIds: surfaceMemory.completedActionIds,
      dismissedSurfaceIds: surfaceMemory.dismissedSurfaceIds,
    },
  });
  const surfaceFrame = surfaceState.frame;
  const { dispatchAndRecord } = useCapabilityDispatch({
    sendPrompt: (text) => {
      if (routeRimvioPromptUri(text, { sendMessage: (nl) => void sendMessage(nl) })) {
        return;
      }
      void sendMessage(text);
    },
  });
  const surfaceFeedback = useSurfaceActionFeedback();
  const { hint: surfaceTransientHint, clearHint: clearSurfaceTransientHint } =
    useSurfaceTransientHint();
  const [surfaceActionGeneration, setSurfaceActionGeneration] = useState(0);
  const showAdaptiveLayers = !surfaceState.learningPaused;
  const threadlineNeedsTap =
    threadlineHeaderStatus(threadlineCards) === "needs_one_tap";
  const { visible: dockActions } = usePredictiveDock({
    messages,
    schedule: masterContext.existingSchedule,
    referenceDate: masterContext.currentDate,
    chatScopeId,
  });

  const causalWhyLine = useMemo(() => {
    if (!eventOsProofRender || !eventOsLastProof) {
      return null;
    }
    return buildUserExplainabilityKoLine(
      eventOsLastProof,
      eventOsProofRender.explainability,
    );
  }, [eventOsLastProof, eventOsProofRender]);
  const actionContextByMessageId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const message of messages) {
      if (message.role === "assistant" && message.text.trim()) {
        map[message.id] = message.text.trim();
      }
    }
    return map;
  }, [messages]);
  const [activeActionsOpen, setActiveActionsOpen] = useState(false);
  const [calendarFullOpen, setCalendarFullOpen] = useState(false);
  const searchParams = useSearchParams();
  const { clearCalendarQuery } = useCalendarSurfaceQuery({
    enabled: isConversation && scopeKind === "search",
    onOpenSheet: () => setActiveActionsOpen(true),
    onOpenFull: () => setCalendarFullOpen(true),
  });
  const handleCalendarFullOpenChange = useCallback(
    (open: boolean) => {
      setCalendarFullOpen(open);
      if (!open && scopeKind === "search" && searchParams.get("calendar") === "full") {
        clearCalendarQuery();
      }
    },
    [clearCalendarQuery, scopeKind, searchParams],
  );
  const handleActiveActionsOpenChange = useCallback(
    (open: boolean) => {
      setActiveActionsOpen(open);
      if (!open && scopeKind === "search" && searchParams.get("calendar") === "sheet") {
        clearCalendarQuery();
      }
    },
    [clearCalendarQuery, scopeKind, searchParams],
  );
  const [resourcePoolOpen, setResourcePoolOpen] = useState(false);
  const [googleSheetOpen, setGoogleSheetOpen] = useState(false);
  const [googleSheetTarget, setGoogleSheetTarget] = useState<GoogleSheetsEmbedTarget | null>(
    null,
  );

  const openGoogleSheet = useCallback((url: string, title?: string) => {
    setGoogleSheetTarget({ url, title });
    setGoogleSheetOpen(true);
    setResourcePoolOpen(false);
  }, []);

  useEffect(() => {
    return subscribeOpenGoogleSheet(({ url, title }) => {
      openGoogleSheet(url, title);
    });
  }, [openGoogleSheet]);

  const { totalCount: resourcePoolCount } = useResourcePool();
  const [schedulingLink, setSchedulingLink] = useState<LinkRow | null>(null);
  const hasActiveDecision = useMemo(
    () => hasActiveDecisionStream(surfaceFrame.layout),
    [surfaceFrame],
  );
  const showLatentSuggestionLayers = useMemo(
    () => shouldRenderLatentSuggestionLayers(surfaceFrame),
    [surfaceFrame],
  );
  const surfacePrimaryUx = useMemo(() => {
    if (surfaceTransientHint) {
      return {
        whyLine: surfaceTransientHint,
        getFeedback: surfaceFeedback.getFeedback,
      };
    }
    const baseWhy = deriveSurfaceWhyLineKo({
      node: surfaceFrame.layout.primary,
      frame: surfaceFrame,
    });
    const loopWhy =
      showAdaptiveLayers && surfaceState.dominantLoop
        ? deriveLoopContextKo(surfaceState.dominantLoop)
        : null;
    const whyLine =
      baseWhy && loopWhy ? `${loopWhy} · ${baseWhy}` : loopWhy ?? baseWhy;
    return {
      whyLine,
      getFeedback: surfaceFeedback.getFeedback,
    };
  }, [
    surfaceFrame,
    surfaceState.dominantLoop,
    surfaceFeedback.getFeedback,
    surfaceTransientHint,
    showAdaptiveLayers,
  ]);

  useSurfaceIgnoreObserver({
    surfaceId: surfaceFrame.layout.primary?.id ?? null,
    capabilityId: surfaceFrame.layout.primary?.primaryAction?.capabilityId ?? null,
    priorityBand: surfaceFrame.layout.primary?.priority?.band,
    enabled: hasActiveDecision,
    resetToken: surfaceActionGeneration,
    onIgnored: () => {
      toast.message("나중에 다시 꺼낼게요 — 지금은 쉬어가도 돼요", { duration: 3200 });
    },
  });
  const handleSurfaceDispatch = useCallback(
    (
      node: Parameters<SurfaceCompositionRuntimeProps["onDispatchCapability"]>[0],
      _actionId: string,
      capabilityId: Parameters<SurfaceCompositionRuntimeProps["onDispatchCapability"]>[2],
    ) => {
      const actionKey = buildSurfaceActionKey(node.id, capabilityId);
      surfaceFeedback.markLoading(actionKey);
      const { result, record } = dispatchAndRecord({
        capabilityId,
        inputs: {
          title: node.title ?? "",
          destination: node.resources.find((r) => r.kind === "location")?.label ?? "",
          place: node.resources.find((r) => r.kind === "location")?.label ?? "",
        },
        metadata: {
          surfaceId: node.id,
          actionKey,
        },
      });
      if (!result.ok) {
        surfaceFeedback.markError(actionKey, derivePrimaryErrorMessage(capabilityId));
        return;
      }
      if (record?.status === "completed") {
        surfaceFeedback.markSuccess(
          actionKey,
          derivePrimarySuccessMessage(capabilityId, node),
        );
      } else if (record?.status === "failed") {
        surfaceFeedback.markError(actionKey, derivePrimaryErrorMessage(capabilityId));
      }
      if (capabilityId === "DISMISS_SURFACE") {
        markOpportunityConsumed(node.id);
      }
      setSurfaceActionGeneration((value) => value + 1);
      clearSurfaceTransientHint();
    },
    [clearSurfaceTransientHint, dispatchAndRecord, surfaceFeedback],
  );
  const prevMessageCountRef = useRef(messages.length);
  const threadScrollStateRef = useRef({
    messageLen: messages.length,
    activeLinkId: activeLink?.id ?? null,
  });

  const handleStartFreshConversation = useCallback(() => {
    onSelectIndex(-1);
    clearChain();
    startFreshConversation();
  }, [clearChain, onSelectIndex, startFreshConversation]);

  const openLinkById = (linkId: string) => {
    const index = links.findIndex((link) => link.id === linkId);
    if (index >= 0) {
      selectLink(linkId);
      onSelectIndex(index);
    }
  };

  const handlePromoteLink = useCallback(
    async (link: LinkRow, date: string, time: string) => {
      const fireAt = buildFireAtFromDateTime(date, time);
      try {
        await promoteLinkToActionStream(link, fireAt);
        toast("액션 스트림에 올렸어요", {
          description: `${date} ${time} · ${link.title}`,
        });
        setSchedulingLink(null);
        setActiveActionsOpen(true);
      } catch (error) {
        const message =
          error instanceof Error && error.message === "fire_at_past"
            ? "이미 지난 시간이에요. 미래 시간을 골라 주세요."
            : "일정을 저장하지 못했어요. 다시 시도해 주세요.";
        toast(message);
      }
    },
    []
  );

  useEffect(() => {
    if (prevMessageCountRef.current > 0 && messages.length === 0) {
      onSelectIndex(-1);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, onSelectIndex]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || messages.length === 0) {
      return;
    }

    const prev = threadScrollStateRef.current;
    const messageGrew = messages.length > prev.messageLen;
    const linkChanged = (activeLink?.id ?? null) !== prev.activeLinkId;
    threadScrollStateRef.current = {
      messageLen: messages.length,
      activeLinkId: activeLink?.id ?? null,
    };

    if (!messageGrew && !linkChanged) {
      return;
    }
    if (messageGrew && !isThreadNearBottom(node)) {
      return;
    }

    scrollThreadToBottom(node, feedThreadScrollBehavior());
  }, [messages.length, activeIndex, activeLink?.id]);

  const feedPeerTalkSendActive = isFeedPeerTalkSendActive(
    feedPeerTalkSession,
    messages,
  );

  return (
    <>
      <div
        data-action-chat-root
        data-action-chat-variant={variant}
        className={cn(
          "action-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          isSlot && "action-shell--slot",
          className
        )}
      >
        <header className="shrink-0 border-b border-border bg-card/95 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-5">
          <div className="flex min-h-9 items-center justify-between gap-2">
            <RimvioLogo size="sm" className="h-7 shrink-0" appearance="dark" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {isConversation && (messages.length > 0 || activeLink) ? (
                <button
                  type="button"
                  onClick={handleStartFreshConversation}
                  className="hidden rounded-full border border-border bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent min-[400px]:inline sm:px-3 sm:text-[12px]"
                >
                  새 대화
                </button>
              ) : null}
              {isSlot ? <RelationshipFeedFolder /> : null}
              {isConversation ? (
                <button
                  type="button"
                  aria-label="리소스풀"
                  onClick={() => setResourcePoolOpen(true)}
                  className="relative flex size-8 items-center justify-center rounded-full bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:size-9"
                >
                  <FolderGit2 className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-rimvio-base px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-[#D8B4FE] shadow-[0_0_8px_rgba(191,90,242,0.35)] sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]",
                      resourcePoolCount <= 0 && "pointer-events-none opacity-0",
                    )}
                    aria-hidden={resourcePoolCount <= 0}
                  >
                    {resourcePoolCount > 9 ? "9+" : resourcePoolCount || "1"}
                  </span>
                </button>
              ) : null}
              <CalendarHeaderControls
                badgeCount={badgeCount}
                onOpenSheet={() => setActiveActionsOpen(true)}
                onOpenFull={
                  isConversation
                    ? () => setCalendarFullOpen(true)
                    : () => router.push("/search?calendar=full")
                }
              />
              {isSlot ? (
              <Link
                href="/welcome"
                aria-label="설정"
                className="flex size-8 items-center justify-center rounded-full bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:size-9"
              >
                <Settings2 className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
              </Link>
              ) : null}
            </div>
          </div>
        </header>

        {isConversation && activeLink ? (
          <div className="max-h-[min(40dvh,220px)] shrink-0 overflow-hidden border-b border-white/[0.06] bg-rimvio-surface-muted">
            <p className="px-5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              현재 맥락
            </p>
            <ActionChatLinkPanel
              key={activeLink.id}
              link={activeLink}
              isActive
              contextRemote={activeIndex === 0 ? contextRemote : null}
              locateResult={activeIndex === 0 ? locateResult : null}
              locateLoading={activeIndex === 0 ? locateLoading : false}
            />
          </div>
        ) : null}

        <ChatAmbientFocusProvider>
        <ChatAmbientShell
          aria-label="채팅"
          suppressDecor={feedPeerTalkSendActive || isSlot}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {isSlot ? (
            <div
              data-feed-slot-bottom-stack
              className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
            >
              <SurfaceStabilityStrip
                learningPaused={surfaceState.learningPaused}
                systemLoadLevel={surfaceState.systemLoadLevel}
              />
              <FeedSlotStage
                frame={surfaceFrame}
                overlayRows={calendarForSheet.overlayRows}
                messages={messages}
                relationshipSlots={relationshipSlots}
                peerDetailCopy={copy.feed.today.peerDetail}
                onDispatchCapability={handleSurfaceDispatch}
                onSpawnPrompt={(uri) => void sendMessage(uri)}
                onFireScheduledNow={triggerScheduledActionNow}
                onOpenCalendar={() => setActiveActionsOpen(true)}
                onLater={() => toast.message("나중에 다시 보여드릴게요", { duration: 2800 })}
                onOpenPeerChat={(peer) => {
                  notifyPeerRoomFromFeed(peer.displayName);
                  router.push(peerRoomPath(peer.peerThreadId));
                }}
                onScrollToFeedMessage={(messageId) => {
                  const node = threadRef.current?.querySelector(
                    `[data-message-id="${messageId}"]`,
                  );
                  if (node) {
                    node.scrollIntoView({ behavior: "smooth", block: "center" });
                    toast.message("대화에서 일정을 찾았어요", { duration: 2800 });
                    return;
                  }
                  setActiveActionsOpen(true);
                  toast.message("캘린더에서 일정을 확인해 주세요", { duration: 2800 });
                }}
                className="min-h-0 flex-1 overflow-hidden"
              />
            </div>
          ) : null}

          <div
            ref={threadRef}
            className={cn(
              "relative z-[1] min-h-0 overflow-y-auto overscroll-y-contain rimvio-feed-scroll-inset touch-pan-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              isSlot ? "hidden" : "flex-1",
            )}
          >
            {isSearchIngress ? (
              <div className="feed-hero-slot shrink-0">
                <SearchIngressPanel copy={copy.search} />
              </div>
            ) : null}

            {isSearchContextBrowse && relatedContextSearch?.result ? (
              <div className="feed-hero-slot shrink-0">
                <SearchRelatedContextPanel
                  copy={copy.search}
                  result={relatedContextSearch.result}
                  onClear={relatedContextSearch.onClear}
                />
              </div>
            ) : null}

            {isSearchMentionRun && searchExecution ? (
              <div className="feed-hero-slot shrink-0 pt-2">
                <SearchExperienceRunBanner
                  headline={searchExecution.headline}
                  featureLabel={resolveExperienceRunFeatureLabel(searchExecution.featureId)}
                />
              </div>
            ) : null}

            {isConversation && !isSearchIngress ? (
            <ExecutionTimeline>
              {threadlineCards.length > 0 ? (
              <TodayThread
                cards={threadlineCards}
                deferredCards={deferredCards}
                onResolveChip={handleThreadlineResolveChip}
                onRestoreDeferred={restoreThreadlineDeferred}
              />
              ) : null}

              <div data-timeline-segment="chat" className="pt-1">
                <ActionChatMessageList
              messages={messages}
              activeLink={activeLink}
              locale={locale}
              copy={copy}
              onRevealActions={revealMessageActions}
              onRevealAlternateActions={revealAlternateMessageActions}
              onConfirmPlace={confirmPlace}
              onCorrectPlace={correctPlace}
              onSelectArea={selectArea}
              chatScopeId={chatScopeId}
              onWittyAction={handleWittyAction}
              onResumeConfirmInterrupt={resumeConfirmInterrupt}
              onCancelConfirmInterrupt={(messageId) => {
                const followUp = dismissConfirmForInterrupt(messageId);
                if (followUp) {
                  void sendMessage(followUp);
                }
              }}
              onInlineTimerComplete={completeInlineTimer}
              onInlineFocusConfirm={confirmInlineFocus}
              onInlineFocusCancel={cancelInlineFocus}
              onInlineFocusComplete={completeInlineFocus}
              calendarOverlayRows={calendarForSheet.overlayRows}
              calendarContextByMessageId={actionContextByMessageId}
              onOpenCalendarSheet={() => setActiveActionsOpen(true)}
              onCalendarSpawnPrompt={(uri) => void sendMessage(uri)}
              onNavigateSpawnPrompt={(uri) => void sendMessage(uri)}
              onScheduleOrganizePrompt={(prompt) => void sendMessage(prompt)}
              onTransferSpawnPrompt={(uri) => void sendMessage(uri)}
              onFocusHeldInAppAction={handleFocusHeldInAppAction}
              onOpenCapture={onOpenCapture}
              onFeedPeerTalkStart={(contact) => {
                void startFeedPeerTalk(contact);
              }}
                />
              </div>
            </ExecutionTimeline>
            ) : null}
          </div>

          {isConversation && !isSearchIngress && !isSearchMentionRun && prepSurface.visible && showLatentSuggestionLayers ? (
            <div className="shrink-0 px-3 pb-1">
              <p className="rounded-xl bg-rimvio-surface-muted/70 px-3 py-2 text-[12px] font-medium text-foreground">
                {prepSurface.title}
              </p>
            </div>
          ) : null}

          {isConversation && !isSearchIngress && !isSearchMentionRun && dockActions.length > 0 && showLatentSuggestionLayers ? (
            <div className="shrink-0 px-3 pb-0.5">
              <PredictiveActionDock
                compact
                actions={dockActions}
                onSelect={(action) => {
                  markOpportunityConsumed(action.id);
                  recordDockActionUsage({ action });
                  window.dispatchEvent(
                    new CustomEvent("rimvio:opportunity-consumed"),
                  );
                  void sendMessage(action.prompt);
                }}
              />
            </div>
          ) : null}

          {isConversation && !isSearchIngress && !isSearchMentionRun && causalWhyLine ? (
            <div className="shrink-0 px-5 pb-1">
              <ActionDockWhyLine line={causalWhyLine} variant="overlay" />
            </div>
          ) : null}

          {isSlot || isConversation ? (
          <div
            className="rimvio-feed-composer-dock shrink-0 touch-manipulation lg:relative lg:z-[2] lg:pointer-events-auto"
            data-feed-composer-dock
          >
            <ActionChatInputBar
              placeholder={
                isSlot
                  ? copy.search.placeholder
                  : feedPeerTalkSendActive && feedPeerTalkSession
                  ? `${feedPeerTalkSession.displayName}에게 메시지`
                  : threadlineNeedsTap
                    ? "오늘에 추가…"
                    : isSearchMentionRun
                      ? copy.search.run.placeholder
                      : searchIngressHint ?? copy.search.placeholder
              }
              initialComposerText={mentionComposerPrefill}
              sending={sending || searchIngesting}
              disabled={sending || searchIngesting}
              onOpenCapture={onOpenCapture}
              onOpenLinkPaste={onOpenLinkPaste}
              onQuickCapture={onQuickCapture}
              onPeerTalkPick={(contact) => {
                void startFeedPeerTalk(contact);
              }}
              onSendComposer={async (payload) => {
                const hasAttachments = (payload.attachments?.length ?? 0) > 0;
                if (!isSlot && scopeKind === "search" && payload.text.trim()) {
                  const intent = classifySearchComposerIntent(payload.text);
                  if (isSearchMentionRun || intent === "mention") {
                    void sendMessage(payload.text, {
                      attachments: payload.attachments,
                      chatAxis: payload.chatAxis,
                    });
                    return true;
                  }
                  if (intent === "context_search" && relatedContextSearch) {
                    relatedContextSearch.onSearch(payload.text);
                    return true;
                  }
                  if (onSearchMemoIngest) {
                    return onSearchMemoIngest(payload.text);
                  }
                  return false;
                }
                if (
                  !isSlot &&
                  feedPeerTalkSendActive &&
                  !hasAttachments &&
                  payload.text.trim() &&
                  !payload.text.trim().startsWith("@")
                ) {
                  const sent = await sendFeedPeerTalk(payload.text);
                  return sent;
                }
                if (sendComposerPayload(payload)) {
                  return true;
                }
                void sendMessage(payload.text, {
                  attachments: payload.attachments,
                  chatAxis: payload.chatAxis,
                });
                return true;
              }}
            />
          </div>
          ) : null}
        </ChatAmbientShell>
        </ChatAmbientFocusProvider>
      </div>

      <OcrReviewDatePickerSheet
        open={datePickerRequest?.type === "OCR_REVIEW_DATE_PICKER"}
        onOpenChange={(open) => {
          if (!open) {
            dismissDatePicker();
          }
        }}
        request={
          datePickerRequest?.type === "OCR_REVIEW_DATE_PICKER"
            ? datePickerRequest
            : null
        }
        onConfirm={(patches) => void confirmOcrReviewDates(patches)}
      />

      <ActionDatePickerSheet
        open={datePickerRequest?.type === "DATE_PICKER"}
        onOpenChange={(open) => {
          if (!open) {
            dismissDatePicker();
          }
        }}
        draftTask={
          datePickerRequest?.type === "DATE_PICKER"
            ? (datePickerRequest.draft_task ?? "일정")
            : "일정"
        }
        onConfirm={(value) => void confirmDatePicker(value)}
      />

      <ResourcePoolSheet
        open={resourcePoolOpen}
        onOpenChange={setResourcePoolOpen}
        links={links}
        onOpenLink={openLinkById}
        onOpenGoogleSheet={openGoogleSheet}
        onOpenCapture={onOpenCapture}
      />

      <GoogleSheetsEmbedSheet
        open={googleSheetOpen}
        onOpenChange={setGoogleSheetOpen}
        target={googleSheetTarget}
      />

      <ActiveActionsSheet
        open={activeActionsOpen}
        onOpenChange={handleActiveActionsOpenChange}
        calendar={calendarForSheet}
        contextByMessageId={actionContextByMessageId}
        onCancelScheduled={cancelScheduledAction}
        onFireScheduledNow={triggerScheduledActionNow}
        onScrollToMessage={(messageId) => {
          const node = threadRef.current?.querySelector(
            `[data-message-id="${messageId}"]`
          );
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onCancelLinkReminder={demoteLinkFromActionStream}
        onOpenLink={openLinkById}
        onAddSchedule={() => {
          threadRef.current
            ?.closest("[data-action-chat-root]")
            ?.querySelector("textarea")
            ?.focus();
          toast.message("채팅에서 일정을 말해 보세요");
        }}
        onOpenFullCalendar={
          isConversation ? () => setCalendarFullOpen(true) : undefined
        }
      />

      {isConversation ? (
        <CalendarFullScreenPanel
          open={calendarFullOpen}
          onOpenChange={handleCalendarFullOpenChange}
          overlayRows={calendarForSheet.overlayRows}
          onAddSchedule={() => {
            handleCalendarFullOpenChange(false);
            threadRef.current
              ?.closest("[data-action-chat-root]")
              ?.querySelector("textarea")
              ?.focus();
            toast.message("채팅에서 일정을 말해 보세요");
          }}
          onSpawnPrompt={(uri) => void sendMessage(uri)}
        />
      ) : null}

      <ActionDatePickerSheet
        open={Boolean(schedulingLink)}
        onOpenChange={(open) => {
          if (!open) {
            setSchedulingLink(null);
          }
        }}
        draftTask={schedulingLink?.title ?? "링크 확인"}
        onConfirm={(value) => {
          if (!schedulingLink) {
            return;
          }
          void handlePromoteLink(schedulingLink, value.date, value.time);
        }}
      />
    </>
  );
}
