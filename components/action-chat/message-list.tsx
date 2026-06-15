"use client";

import { Loader2 } from "lucide-react";
import {
  hasMentionInlinePayload,
  MentionInlineMessage,
} from "@/components/action-chat/mention-inline-message";
import { FeedPeerTalkFeedRows } from "@/components/action-chat/feed-peer-talk-thread";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { ChatThinkingBubble } from "@/components/action-chat/chat-thinking-bubble";
import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import { ConfirmActionCard } from "@/components/action-chat/confirm-action-card";
import { ConfirmInterruptCard } from "@/components/action-chat/confirm-interrupt-card";
import { FlushResultStrip } from "@/components/action-chat/flush-result-strip";
import { ThoughtBubble } from "@/components/action-chat/thought-bubble";
import { ActionChatGrid } from "@/components/action-chat/action-grid";
import { AiChatBubble, ContainerEnter, UserChatBubble } from "@/components/action-chat/chat-bubble";
import { ContainerCard } from "@/components/action-chat/container-card";
import {
  ConfirmRevealButtons,
  MagicActionTrigger,
  RevealedActionGrid,
} from "@/components/action-chat/magic-action-ui";
import { OrchestratorMetaStrip } from "@/components/action-chat/orchestrator-meta-strip";
import { TransportLiveCardView } from "@/components/action-chat/transport-live-card";
import { ActionCountdownStrip } from "@/components/action-chat/action-countdown-strip";
import { resolveActionDatetimeIso } from "@/lib/action-chat/action-countdown";
import {
  isActionContainerMessage,
  resolveContainerPresentation,
} from "@/lib/action-chat/container-presentation";
import { resolveActionOfferUx } from "@/lib/action-chat/trust-disclosure";
import { useActionTrust } from "@/hooks/use-action-trust";
import { useNavSectorPicker } from "@/hooks/use-nav-sector-picker";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import { chatActionLink } from "@/lib/action-chat/chat-link-stub";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/types";
import type { Copy } from "@/lib/i18n/types";
import {
  resolveChatBubbleFocusTone,
  resolveFocusedTurnMessageIds,
  useChatAmbientFocusOptional,
} from "@/components/action-chat/chat-ambient-focus";
import { cn } from "@/lib/utils";
import { resolveChatBubbleGroup } from "@/lib/ui/chat-bubble-group";
import type { ChatBubbleGroup } from "@/lib/ui/chat-bubble-group";

function shouldShowCompactThinkingBubble(message: ActionChatMessage): boolean {
  if (!message.loading || hasMentionInlinePayload(message)) {
    return false;
  }

  return (
    !message.actions?.length &&
    !message.entityQuickPick &&
    !message.cafeDiscovery &&
    !message.transportLive &&
    message.confirmation?.meta?.intent !== "CONFIRM" &&
    message.confirmation?.meta?.intent !== "WITTY" &&
    message.scheduledDelivery?.status !== "pending"
  );
}

type ActionChatMessageListProps = {
  messages: ActionChatMessage[];
  activeLink?: LinkRow | null;
  locale: AppLocale;
  copy: Copy;
  onRevealActions?: (messageId: string) => void;
  onRevealAlternateActions?: (messageId: string) => void;
  onConfirmPlace?: (messageId: string) => void;
  onCorrectPlace?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  onSelectArea?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  chatScopeId?: string;
  onWittyAction?: (messageId: string, action: string) => void;
  onResumeConfirmInterrupt?: (messageId: string) => void;
  onCancelConfirmInterrupt?: (messageId: string) => void;
  onInlineTimerComplete?: (messageId: string) => void;
  onInlineFocusConfirm?: (messageId: string) => void;
  onInlineFocusCancel?: (messageId: string) => void;
  onInlineFocusComplete?: (messageId: string) => void;
  calendarOverlayRows?: UnifiedCalendarOverlayRow[];
  calendarContextByMessageId?: Record<string, string>;
  onOpenCalendarSheet?: () => void;
  onCalendarSpawnPrompt?: (uri: string) => void;
  onNavigateSpawnPrompt?: (uri: string) => void;
  onScheduleOrganizePrompt?: (prompt: string) => void;
  onTransferSpawnPrompt?: (uri: string) => void;
  onFocusHeldInAppAction?: (
    messageId: string,
    shadowId: string,
    action: FocusHeldActionWire,
  ) => void;
  onOpenCapture?: () => void;
  onFeedPeerTalkStart?: (contact: PeerContact) => void;
  className?: string;
};

function AssistantOfferMessage({
  message,
  locale,
  onRevealActions,
  onRevealAlternateActions,
  onConfirmPlace,
  onCorrectPlace,
  onSelectArea,
  chatScopeId,
  onWittyAction,
  onResumeConfirmInterrupt,
  onCancelConfirmInterrupt,
  onInlineTimerComplete,
  onInlineFocusConfirm,
  onInlineFocusCancel,
  onInlineFocusComplete,
  calendarOverlayRows,
  calendarContextByMessageId,
  onOpenCalendarSheet,
  onCalendarSpawnPrompt,
  onNavigateSpawnPrompt,
  onScheduleOrganizePrompt,
  onTransferSpawnPrompt,
  onFocusHeldInAppAction,
  onOpenCapture,
  onFeedPeerTalkStart,
  onAction,
  bubbleGroup = "single",
}: {
  message: ActionChatMessage;
  locale: AppLocale;
  bubbleGroup?: ChatBubbleGroup;
  onRevealActions?: (messageId: string) => void;
  onRevealAlternateActions?: (messageId: string) => void;
  onConfirmPlace?: (messageId: string) => void;
  onCorrectPlace?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  onSelectArea?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  chatScopeId?: string;
  onWittyAction?: (messageId: string, action: string) => void;
  onResumeConfirmInterrupt?: (messageId: string) => void;
  onCancelConfirmInterrupt?: (messageId: string) => void;
  onInlineTimerComplete?: (messageId: string) => void;
  onInlineFocusConfirm?: (messageId: string) => void;
  onInlineFocusCancel?: (messageId: string) => void;
  onInlineFocusComplete?: (messageId: string) => void;
  calendarOverlayRows?: UnifiedCalendarOverlayRow[];
  calendarContextByMessageId?: Record<string, string>;
  onOpenCalendarSheet?: () => void;
  onCalendarSpawnPrompt?: (uri: string) => void;
  onNavigateSpawnPrompt?: (uri: string) => void;
  onScheduleOrganizePrompt?: (prompt: string) => void;
  onTransferSpawnPrompt?: (uri: string) => void;
  onFocusHeldInAppAction?: (
    messageId: string,
    shadowId: string,
    action: FocusHeldActionWire,
  ) => void;
  onOpenCapture?: () => void;
  onFeedPeerTalkStart?: (contact: PeerContact) => void;
  onAction: (action: LinkActionItem) => void;
}) {
  useActionTrust();
  const primary = message.actions?.[0];
  const secondary = message.actions?.slice(1) ?? [];
  const confidence = message.confidence ?? 0.85;
  const userRevealed = message.actionsRevealed ?? false;
  const presentation = resolveContainerPresentation(message);
  const isContainer = isActionContainerMessage(message);
  const placeOptions = message.cafeDiscovery?.options ?? [];
  const isPlaceDiscovery = placeOptions.length > 0;

  const thoughtText = message.thought ?? message.confirmation?.thought;
  const actionTargetIso = resolveActionDatetimeIso({
    extracted: message.scheduleExtract ?? message.confirmation?.extracted_data,
    batchPending: message.confirmation?.batch_pending,
  });

  const isScheduledPending = message.scheduledDelivery?.status === "pending";

  const isInteractionCard =
    (message.confirmation?.meta?.intent === "CONFIRM" ||
      message.confirmation?.meta?.intent === "WITTY") &&
    !message.actions?.length;

  const ux = resolveActionOfferUx({
    confidence,
    actionsRevealed: isPlaceDiscovery ? true : userRevealed,
    hasActions: Boolean(primary) || isPlaceDiscovery,
    loading: message.loading,
  });
  const showActionGrid = isPlaceDiscovery || ux.showActionGrid;

  if (hasMentionInlinePayload(message)) {
    return (
      <MentionInlineMessage
        message={message}
        calendarOverlayRows={calendarOverlayRows}
        calendarContextByMessageId={calendarContextByMessageId}
        onInlineTimerComplete={onInlineTimerComplete}
        onInlineFocusConfirm={onInlineFocusConfirm}
        onInlineFocusCancel={onInlineFocusCancel}
        onInlineFocusComplete={onInlineFocusComplete}
        onOpenCalendarSheet={onOpenCalendarSheet}
        onCalendarSpawnPrompt={onCalendarSpawnPrompt}
        onNavigateSpawnPrompt={onNavigateSpawnPrompt}
        onScheduleOrganizePrompt={onScheduleOrganizePrompt}
        onTransferSpawnPrompt={onTransferSpawnPrompt}
        onFocusHeldInAppAction={onFocusHeldInAppAction}
        onOpenCapture={onOpenCapture}
        onFeedPeerTalkStart={onFeedPeerTalkStart}
      />
    );
  }

  if (shouldShowCompactThinkingBubble(message)) {
    return <ChatThinkingBubble group={bubbleGroup} />;
  }

  if (isScheduledPending) {
    return (
      <div className="space-y-2">
        <AiChatBubble group={bubbleGroup}>{message.text}</AiChatBubble>
        {thoughtText ? (
          <div className="px-5">
            <ThoughtBubble text={thoughtText} />
          </div>
        ) : null}
        <ContainerEnter>
          <ContainerCard
            icon={presentation.icon}
            title={message.scheduleExtract?.place_name ?? presentation.title}
            body="캘린더에 넣어뒀어요. 시간되면 길찾기를 꺼낼게요."
            chips={presentation.chips}
            loading={message.loading}
            meta={
              actionTargetIso ? (
                <ActionCountdownStrip targetIso={actionTargetIso} phase="scheduled" />
              ) : null
            }
            footer={null}
          />
        </ContainerEnter>
      </div>
    );
  }

  if (isInteractionCard) {
    const personaMessage =
      message.confirmation?.persona_message ?? message.text;

    return (
      <div className="space-y-2">
        <AiChatBubble group={bubbleGroup}>
          {message.loading ? (
            <span className="chat-bubble--thinking inline-flex items-center gap-1.5">
              <Loader2 className="size-3 shrink-0 animate-spin text-rimvio-neon-cyan" />
              [생각중...]
            </span>
          ) : (
            personaMessage
          )}
        </AiChatBubble>

        {thoughtText ? (
          <div className="px-5">
            <ThoughtBubble text={thoughtText} />
          </div>
        ) : null}

        <ContainerEnter>
          <ContainerCard
            icon={presentation.icon}
            title={presentation.title}
            body={presentation.body}
            chips={presentation.chips}
            loading={message.loading}
            meta={
              <div className="space-y-2">
                {message.confirmation?.interrupt?.awaiting_choice ? (
                  <ConfirmInterruptCard
                    userMessage={message.confirmation.interrupt.user_message}
                    onResume={() => onResumeConfirmInterrupt?.(message.id)}
                    onCancel={() => onCancelConfirmInterrupt?.(message.id)}
                  />
                ) : null}
                <ConfirmActionCard
                  dataPrompt={message.confirmation?.confirm_message}
                  extracted={message.confirmation?.extracted_data}
                  batchPending={message.confirmation?.batch_pending}
                  wittyButtons={message.confirmation?.witty_buttons}
                  locationUx={message.confirmation?.location_ux}
                  areaDisambiguation={message.confirmation?.area_disambiguation}
                  locationSuggestions={message.confirmation?.location_suggestions}
                  chatScopeId={chatScopeId}
                  onAccept={() => onConfirmPlace?.(message.id)}
                  onReject={() => undefined}
                  onSelectLocation={(suggestion) =>
                    onCorrectPlace?.(message.id, suggestion)
                  }
                  onSelectArea={(suggestion) => onSelectArea?.(message.id, suggestion)}
                  onWittyAction={(action) => onWittyAction?.(message.id, action)}
                />
                {message.flushReport ? (
                  <FlushResultStrip report={message.flushReport} />
                ) : null}
              </div>
            }
            footer={null}
          />
        </ContainerEnter>
      </div>
    );
  }

  if (!isContainer) {
    return (
      <AiChatBubble group={bubbleGroup}>
        {message.loading ? (
          <span className="chat-bubble--thinking inline-flex items-center gap-1.5">
            <Loader2 className="size-3 shrink-0 animate-spin text-rimvio-neon-cyan" />
            [생각중...]
          </span>
        ) : (
          <div className="space-y-2">
            {thoughtText ? <ThoughtBubble text={thoughtText} /> : null}
            <div>{message.text}</div>
          </div>
        )}
      </AiChatBubble>
    );
  }

  const metaContent =
    thoughtText ||
    message.confirmation?.interrupt?.awaiting_choice ||
    ux.showConfirmPrompt ||
    ux.offerAutoRun ||
    message.flushReport ? (
      <div className="space-y-2">
        {thoughtText ? <ThoughtBubble text={thoughtText} /> : null}
        {message.confirmation?.interrupt?.awaiting_choice ? (
          <ConfirmInterruptCard
            userMessage={message.confirmation.interrupt.user_message}
            onResume={() => onResumeConfirmInterrupt?.(message.id)}
            onCancel={() => onCancelConfirmInterrupt?.(message.id)}
          />
        ) : null}
        {ux.showConfirmPrompt ? (
          <ConfirmRevealButtons
            onConfirm={() => onRevealActions?.(message.id)}
            onAlternate={() => onRevealAlternateActions?.(message.id)}
            showAlternate={(message.actions?.length ?? 0) > 1}
          />
        ) : null}
        {ux.offerAutoRun ? (
          <p className="text-[11px] font-medium text-rimvio-neon-cyan/80">
            자동 실행 준비됨 · 1순위 버튼을 탭하세요
          </p>
        ) : null}
        <OrchestratorMetaStrip message={message} />
        {message.flushReport ? <FlushResultStrip report={message.flushReport} /> : null}
      </div>
    ) : null;

  return (
    <ContainerEnter>
      <ContainerCard
        icon={presentation.icon}
        title={presentation.title}
        body={presentation.body}
        chips={presentation.chips}
        loading={message.loading}
        compact={isPlaceDiscovery}
        meta={metaContent}
        footer={
          !message.loading ? (
            <div className="relative z-10 space-y-1.5">
              {message.transportLive ? (
                <TransportLiveCardView
                  card={message.transportLive}
                  actions={message.actions ?? []}
                  onAction={onAction}
                  embedded
                />
              ) : null}

              {ux.showMagicPulse ? (
                <MagicActionTrigger onClick={() => onRevealActions?.(message.id)} />
              ) : null}

              {primary && !message.transportLive ? (
                <RevealedActionGrid open={showActionGrid}>
                  <ActionChatGrid
                    primary={primary}
                    primaryLabel={cleanFeedActionLabel(primary.label, locale)}
                    secondary={secondary}
                    locale={locale}
                    layout="horizontal"
                    emphasizePrimary={ux.emphasizePrimary}
                    onPrimary={() => onAction(primary)}
                    onAction={onAction}
                  />
                </RevealedActionGrid>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1 py-1 text-[13px] text-[#6B7280]">
              <Loader2 className="size-4 animate-spin text-rimvio-neon-cyan" />
              {message.text}
            </div>
          )
        }
      />
    </ContainerEnter>
  );
}

export function ActionChatMessageList({
  messages,
  activeLink = null,
  locale,
  copy,
  onRevealActions,
  onRevealAlternateActions,
  onConfirmPlace,
  onCorrectPlace,
  onSelectArea,
  chatScopeId,
  onWittyAction,
  onResumeConfirmInterrupt,
  onCancelConfirmInterrupt,
  onInlineTimerComplete,
  onInlineFocusConfirm,
  onInlineFocusCancel,
  onInlineFocusComplete,
  calendarOverlayRows,
  calendarContextByMessageId,
  onOpenCalendarSheet,
  onCalendarSpawnPrompt,
  onNavigateSpawnPrompt,
  onScheduleOrganizePrompt,
  onTransferSpawnPrompt,
  onFocusHeldInAppAction,
  onOpenCapture,
  onFeedPeerTalkStart,
  className,
}: ActionChatMessageListProps) {
  const { requestNavSector, shouldOpenNavSector, navSectorSheet } = useNavSectorPicker({
    copy,
    resolveLink: () => chatActionLink(activeLink),
  });
  const ambient = useChatAmbientFocusOptional();
  const composerLive = ambient?.composerLive ?? false;
  const focusedTurnIds = resolveFocusedTurnMessageIds(messages);

  const handleAction = (action: LinkActionItem) => {
    if (shouldOpenNavSector(action)) {
      requestNavSector(action, activeLink);
      return;
    }

    void runFeedLinkAction(action, chatActionLink(activeLink), copy).catch(() => {
      // runFeedLinkAction surfaces its own toasts when possible
    });
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("px-4 pb-4 pt-2", className)}>
        {messages.map((message, index) => {
          const bubbleGroup = resolveChatBubbleGroup(messages, index);
          const focusTone = resolveChatBubbleFocusTone(
            message.id,
            focusedTurnIds,
            composerLive,
          );

          if (message.role === "user") {
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className="chat-message-focus"
                data-bubble-focus={focusTone}
                data-bubble-group={bubbleGroup}
                data-bubble-role="user"
              >
                <UserChatBubble group={bubbleGroup}>{message.text}</UserChatBubble>
              </div>
            );
          }

          if (message.feedPeerTalkThread) {
            return (
              <FeedPeerTalkFeedRows
                key={message.id}
                messageId={message.id}
                thread={message.feedPeerTalkThread}
                parentBubbleGroup={bubbleGroup}
                messages={messages}
                messageIndex={index}
                focusedTurnIds={focusedTurnIds}
                composerLive={composerLive}
              />
            );
          }

          return (
            <div
              key={message.id}
              data-message-id={message.id}
              className="chat-message-focus"
              data-bubble-focus={focusTone}
              data-bubble-group={bubbleGroup}
              data-bubble-role="assistant"
            >
              <AssistantOfferMessage
                message={message}
                locale={locale}
                bubbleGroup={bubbleGroup}
                onRevealActions={onRevealActions}
                onRevealAlternateActions={onRevealAlternateActions}
                onConfirmPlace={onConfirmPlace}
                onCorrectPlace={onCorrectPlace}
                onSelectArea={onSelectArea}
                chatScopeId={chatScopeId}
                onWittyAction={onWittyAction}
                onResumeConfirmInterrupt={onResumeConfirmInterrupt}
                onCancelConfirmInterrupt={onCancelConfirmInterrupt}
                onInlineTimerComplete={onInlineTimerComplete}
                onInlineFocusConfirm={onInlineFocusConfirm}
                onInlineFocusCancel={onInlineFocusCancel}
                onInlineFocusComplete={onInlineFocusComplete}
                calendarOverlayRows={calendarOverlayRows}
                calendarContextByMessageId={calendarContextByMessageId}
                onOpenCalendarSheet={onOpenCalendarSheet}
                onCalendarSpawnPrompt={onCalendarSpawnPrompt}
                onNavigateSpawnPrompt={onNavigateSpawnPrompt}
                onScheduleOrganizePrompt={onScheduleOrganizePrompt}
                onTransferSpawnPrompt={onTransferSpawnPrompt}
                onFocusHeldInAppAction={onFocusHeldInAppAction}
                onOpenCapture={onOpenCapture}
                onFeedPeerTalkStart={onFeedPeerTalkStart}
                onAction={handleAction}
              />
            </div>
          );
        })}
      </div>
      {navSectorSheet}
    </>
  );
}
