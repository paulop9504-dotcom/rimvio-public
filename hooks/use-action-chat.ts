"use client";



import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { fetchWithTimeout, FetchTimeoutError } from "@/lib/http/fetch-with-timeout";

import { isUserConfirmingActions, isUserRequestingAlternate } from "@/lib/action-chat/action-confidence";
import { findPendingConfirmation } from "@/lib/action-chat/resolve-affirmative-confirm";
import { applyAlternateActionOffer } from "@/lib/action-chat/rotate-action-offer";

import {
  readClientMasterOrchestratorContext,
  serializeMasterContextForApi,
} from "@/lib/action-chat/client-master-context";
import { applyUserStatusPatchFromApi } from "@/lib/global-brain/user-status-store";
import { applyPreferencePatchFromApi } from "@/lib/preference/preference-store";
import { touchNexusContact } from "@/lib/nexus-db/contact-store";
import { applyEventCandidateUpsertFromApi } from "@/lib/events/emit-event-candidate";
import { applyOcrCalendarCommitToClient } from "@/lib/event-kernel/review/sync-ocr-commit-to-client";
import { resolveAssistantDisplaySummary } from "@/lib/action-chat/resolve-assistant-display-summary";
import {
  ingestConfirmationSignal,
  ingestScheduleSignal,
} from "@/lib/events/event-ingest-pipeline";
import { handlePackingItemToggle } from "@/lib/trip-controller/orchestrate-trip-interaction";
import { RIMVIO_CONVERSATION_LINES } from "@/lib/action-chat/rimvio-persona";
import { resolveClientRecoveryText } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import { submitLiveTurn } from "@/lib/self-learning/submit-live-turn-client";
import type {
  ActionUiTriggerWire,
  OcrReviewDatePickerWire,
} from "@/lib/action-chat/action-oriented-prompt";
import { classifyApprovalSpeechAct } from "@/lib/event-kernel/review/classify-approval-speech-act";
import { OCR_REVIEW_DATES_PREFIX } from "@/lib/event-kernel/review/pending-event-candidate-dates";
import {
  applyReviewExecutionClientIngress,
  orchestratorFromReviewProcess,
  proofFromReviewProcess,
  uiEmitFromReviewProcess,
} from "@/lib/event-os/apply-review-execution-response";
import {
  applyProofOnlyToClient,
  applyUiEmitToClient,
} from "@/lib/event-os/runtime/apply-ui-emit-to-client";
import type { ProofUIRenderModel } from "@/lib/event-os/ui-binding";
import { useThreadline } from "@/hooks/use-threadline";
import type { ResolveChipPayload } from "@/lib/threadline";
import { getReviewState } from "@/lib/event-kernel/review/review-state";
import type { ReviewExecutionInput } from "@/lib/event-os/review-execution-types";
import { submitReviewExecution } from "@/lib/event-os/review-execution-client";
import { buildPeerComposerContextBlock } from "@/lib/context/build-peer-composer-context";
import { isCommandOsInput } from "@/lib/command-os/parse-command-input";
import { formatMentionComposerBlock, parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { tryDispatchLocalMentionTurn } from "@/lib/action-chat/dispatch-local-mention-turn";
import { isLocalInlineMentionFeature } from "@/lib/action-chat/mention-actions/mention-action-inline-features";
import {
  tryCommitParkingPhotoTurn,
} from "@/lib/action-chat/mention-parking/commit-mention-parking-turn";
import {
  consumeParkingPhotoCapture,
  isParkingPhotoCapturePending,
} from "@/lib/local-parking/parking-photo-session";
import {
  applyFocusCancelToMessages,
  applyFocusCompleteToMessages,
  applyFocusConfirmToMessages,
  applyFocusHeldInAppActionToMessages,
} from "@/lib/action-chat/mention-focus/apply-focus-message-update";
import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/build-focus-held-panel";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import {
  ensureNotificationAccessForFocus,
  openNotificationAccessSettings,
} from "@/lib/native-bridge/native-notification-bridge";
import { submitCommandCompile } from "@/lib/command-os/command-os-client";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import { toast } from "sonner";
import {
  appendStudyQaFollowUpIfNeeded,
  executeStudyAuxClient,
  readAutoExecuteStudyAux,
  tryConsumeLectureUrlRegistration,
} from "@/lib/contextual-aux/study/execute-study-aux-client";
import {
  isAwaitingLectureUrl,
  isStudyQaModeActive,
} from "@/lib/contextual-aux/study/study-aux-session";
import { resolveStudyAuxFromLabel } from "@/lib/contextual-aux/study/resolve-study-action-label";
import type { StudyAuxKind } from "@/lib/contextual-aux/study/types";

import {

  actionChatScopeId,

  clearAllActionChatMessageScopes,

  readActionChatMessages,

  writeActionChatMessages,

} from "@/lib/action-chat/chat-store";
import { recordRecentAreaPick } from "@/lib/location-memory/recent-area-picks";
import { publishGoalSnapshotFromTurn } from "@/lib/goal-engine/goal-snapshot-session";
import { archiveAndClearChatSession } from "@/lib/conversation-memory/archive-session";
import { clearActiveChains } from "@/lib/containers/active-chains-state";
import {
  resetFeedPeerTalkSession,
  startFeedPeerTalkInFeed,
  sendFeedPeerTalkInFeed,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-actions";
import { resolveFeedPeerTalkSessionFromMessages } from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";
import { isRimvioPromptUri, routeRimvioPromptUri } from "@/lib/action-chat/rimvio-prompt-router";
import {
  isFeedPeerTalkSendActive,
  syncFeedPeerTalkSessionWithMessages,
} from "@/lib/action-chat/feed-peer-talk/is-feed-peer-talk-send-active";
import {
  clearFeedPeerTalkSession,
  getFeedPeerTalkSession,
  setFeedPeerTalkSession,
  subscribeFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import type { PeerContact } from "@/lib/context/peer-contact-types";

import { buildActionsFromConfirmationData } from "@/lib/action-chat/build-confirmation-actions";
import { buildActionsFromBatchPending } from "@/lib/action-chat/build-batch-pending-actions";
import {
  applyLocationCorrectionToConfirm,
  attachConfirmInterrupt,
  buildLocationCorrectionFromInput,
  cancelPendingConfirm,
  classifyConfirmInterrupt,
  clearConfirmInterrupt,
  findPendingPlaceConfirm,
  respondToConfirmSystemQuery,
} from "@/lib/action-chat/confirm-interrupt";
import { flushBatchPendingTransactionally } from "@/lib/action-chat/transactional-flush";
import type {
  ConfirmationExtractedData,
  LocationSuggestion,
  OrchestratorConfirmationWire,
  TransactionalFlushReport,
} from "@/lib/action-chat/confirmation-types";
import {
  appendCorrectionLog,
  listCorrectionLogs,
} from "@/lib/corrections/correction-log";
import { resolvePriorPlaceChoice } from "@/lib/corrections/prior-place-choice";
import {
  buildPlacePreferencesWire,
  savePlacePreferenceToKnowledge,
} from "@/lib/corrections/place-preference-knowledge";
import { buildLocationMemoryWire } from "@/lib/location-memory/format-life-zone-context";
import {
  appendSearchActivity,
  listSearchActivities,
} from "@/lib/location-memory/search-activity-log";
import {
  inferSearchActivityKind,
  shouldLogSearchActivity,
} from "@/lib/location-memory/log-search-activity";
import {
  armScheduledActionDelivery,
  cancelChatScheduledEventDelivery,
  disarmScheduledActionDelivery,
  restoreScheduledActionDeliveries,
} from "@/lib/action-chat/arm-scheduled-action-delivery";
import { completeChatScheduledEvent } from "@/lib/events/chat-scheduled-ingest";
import {
  buildScheduledPlaceNavActions,
  formatScheduledDeliverySummary,
  formatScheduledFireSummary,
  formatJITScheduledFireSummary,
  saveScheduledTravelToCalendar,
  shouldDeferActionsForSchedule,
} from "@/lib/action-chat/scheduled-action-delivery";
import { compileJITTravelFire } from "@/lib/context-resolver/compile-travel-action";
import { shouldUseJITEventDelivery } from "@/lib/context-resolver/event-from-schedule";
import type { TimeChoiceExecuteInput } from "@/lib/time-decision/time-choice-execute-input";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { CompiledTravelAction } from "@/lib/context-resolver/types";
import {
  mergeOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { evaluateProactiveTransportNudge } from "@/lib/transport/proactive-transport-nudge";
import { buildTransportLiveOrchestratorPayload } from "@/lib/transport/transport-live-service";

import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { readStoredChatAxis } from "@/lib/action-chat/chat-three-axis";
import { parseMentionAxisInput } from "@/lib/action-chat/mention-axis/parse-mention-axis";
import { resolveMentionAxisSendContext } from "@/lib/action-chat/mention-axis/resolve-mention-axis-send";
import { parseTikiChoiceOptions } from "@/lib/action-chat/parse-tiki-choice-options";
import type { HitRunFeedbackVerdict } from "@/lib/action-chat/hit-run-feedback/types";
import {
  readVitalityMemory,
  writeVitalityMemory,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-memory-client";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";
import {
  buildComposerOrchestrateMessage,
  resolveComposerAttachments,
  revokeComposerAttachmentUrls,
} from "@/lib/action-chat/composer-attachments";
import { ingestPastedLinks } from "@/lib/share/inbox-paste";
import type { LinkRow } from "@/types/database";
import { buildLinkedLinksWire } from "@/lib/feed/link-context-chain";
import { parseTurnIntent } from "@/lib/action-chat/turn/parse-turn-intent";
import { executeOrchestrateTurn } from "@/lib/action-chat/turn/execute-orchestrate-turn";
import { resolveClientTurnRoute } from "@/lib/action-chat/turn/resolve-client-turn-route";

function findPriorUserInput(
  messages: ActionChatMessage[],
  assistantId: string
): string | null {
  const index = messages.findIndex((message) => message.id === assistantId);
  if (index <= 0) {
    return null;
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (messages[cursor]?.role === "user") {
      return messages[cursor]!.text;
    }
  }

  return null;
}

function mergeConfirmedActions(
  extracted: ConfirmationExtractedData,
  confirmation?: OrchestratorConfirmationWire
) {
  const placeActions = buildActionsFromConfirmationData(extracted);
  const pendingActions = buildActionsFromBatchPending(confirmation?.batch_pending);

  const seen = new Set<string>();
  return [...placeActions, ...pendingActions].filter((action) => {
    const key = action.href ?? action.label;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function applyPlaceConfirmation(
  messages: ActionChatMessage[],
  messageId: string,
  extracted: ConfirmationExtractedData,
  summary: string,
  flushReport?: TransactionalFlushReport
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const actions = mergeConfirmedActions(extracted, message.confirmation);

    return {
      ...message,
      text:
        flushReport?.failed.length || flushReport?.hasPartialFailure
          ? (flushReport?.summary ?? summary)
          : summary,
      actions,
      actionsRevealed: true,
      pendingConfirm: false,
      flushReport,
      confirmation: message.confirmation
        ? {
            ...message.confirmation,
            meta: { intent: "EXECUTE" },
            extracted_data: extracted,
            batch_pending: [],
            interrupt: undefined,
          }
        : undefined,
    };
  });
}

function applyJITScheduledFire(
  messages: ActionChatMessage[],
  messageId: string,
  extracted: ConfirmationExtractedData,
  compiled: CompiledTravelAction
): ActionChatMessage[] {
  const placeLabel = extracted.place_name ?? extracted.address ?? "목적지";

  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          text: formatJITScheduledFireSummary({
            placeLabel,
            summary: compiled.summary,
          }),
          actions: compiled.actions,
          actionsRevealed: true,
          pendingConfirm: false,
          scheduledDelivery: {
            fire_at: compiled.show_at,
            status: "fired",
          },
          scheduleExtract: extracted,
          confirmation: undefined,
        }
      : message
  );
}

function applyScheduledFire(
  messages: ActionChatMessage[],
  messageId: string,
  extracted: ConfirmationExtractedData
): ActionChatMessage[] {
  const placeLabel = extracted.place_name ?? extracted.address ?? "목적지";
  const actions = buildScheduledPlaceNavActions(extracted);

  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          text: formatScheduledFireSummary(placeLabel),
          actions,
          actionsRevealed: true,
          pendingConfirm: false,
          scheduledDelivery: {
            fire_at: extracted.datetime ?? message.scheduledDelivery?.fire_at ?? "",
            status: "fired",
          },
          scheduleExtract: extracted,
          confirmation: undefined,
        }
      : message
  );
}

function createMessage(

  role: ActionChatMessage["role"],

  text: string,

  extra?: Partial<ActionChatMessage>

): ActionChatMessage {

  return {

    id: crypto.randomUUID(),

    role,

    text,

    createdAt: new Date().toISOString(),

    ...extra,

  };

}



function revealAssistantMessage(

  messages: ActionChatMessage[],

  messageId: string

): ActionChatMessage[] {

  return messages.map((message) =>

    message.id === messageId

      ? { ...message, actionsRevealed: true, pendingConfirm: false }

      : message

  );

}

function revealAlternateAssistantMessage(

  messages: ActionChatMessage[],

  messageId: string

): ActionChatMessage[] {

  return messages.map((message) => {

    if (message.id !== messageId) {

      return message;

    }

    const actions = message.actions ?? [];

    if (actions.length <= 1) {

      return { ...message, actionsRevealed: true, pendingConfirm: false };

    }

    const alternate = applyAlternateActionOffer({

      actions,

      summary: message.text,

    });

    return {

      ...message,

      actions: alternate.actions,

      text: alternate.summary ?? message.text,

      actionsRevealed: true,

      pendingConfirm: false,

    };

  });

}



export function useActionChat(
  activeLink: LinkRow | null,
  chainedLinks: LinkRow[] = [],
  options?: { scopeKind?: import("@/lib/action-chat/chat-store").ActionChatScopeKind },
) {

  const scopeId = actionChatScopeId(
    activeLink?.id,
    options?.scopeKind ?? (activeLink ? "link" : "free"),
  );

  const [messages, setMessages] = useState<ActionChatMessage[]>([]);

  const [sending, setSending] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const SESSION_IDLE_MS = 5 * 60 * 1000;

  const [datePickerRequest, setDatePickerRequest] = useState<ActionUiTriggerWire | null>(
    null
  );

  const REVIEW_EXECUTION_SCOPE = "default";
  const [reviewGatePhase, setReviewGatePhase] = useState<
    "awaiting_date" | "awaiting_confirm" | null
  >(null);
  const reviewGatePhaseRef = useRef<"awaiting_date" | "awaiting_confirm" | null>(
    null
  );

  const threadlineResolveRef = useRef<
    (payload: ResolveChipPayload) => void | Promise<void>
  >(async () => {});

  const sendMessageRef = useRef<
    (text: string, options?: { attachments?: ComposerAttachment[]; chatAxis?: ChatAxis }) => Promise<void>
  >(async () => {});

  const eventOsLastProofRef = useRef<
    import("@/lib/event-os/causal-proof-types").CausalProof | null
  >(null);

  const {
    threadlineCards,
    deferredCards,
    ingestProof,
    seedFromOcrTrigger,
    handleResolveChip: handleThreadlineResolveChip,
    restoreDeferred,
    resetThreadline,
  } = useThreadline({
    sending,
    gatePhase: reviewGatePhase,
    onResolvePayload: (payload) => threadlineResolveRef.current(payload),
  });

  const [eventOsProofRender, setEventOsProofRender] =
    useState<ProofUIRenderModel | null>(null);
  const [eventOsLastProof, setEventOsLastProof] = useState<
    import("@/lib/event-os/causal-proof-types").CausalProof | null
  >(null);

  const syncReviewGatePhase = useCallback(
    (phase: "awaiting_date" | "awaiting_confirm" | null) => {
      reviewGatePhaseRef.current = phase;
      setReviewGatePhase(phase);
    },
    []
  );

  const syncThreadlineFromOrchestrator = useCallback(
    (payload: OrchestratorResultWire | null | undefined) => {
      if (payload?.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER") {
        seedFromOcrTrigger(payload.uiTrigger, "awaiting_date");
        return;
      }
      const route = payload?.meta?.execution_route;
      if (route === "EVENT_REVIEW_DATE_CONFIRM") {
        const rows: OcrReviewDatePickerWire["rows"] =
          eventOsLastProofRef.current?.stateAfter.pendingCandidates.map(
            (row) => ({
              candidateId: row.id,
              title: row.title,
              time: row.time,
            })
          ) ?? [];
        if (rows.length > 0) {
          seedFromOcrTrigger(
            { type: "OCR_REVIEW_DATE_PICKER", rows },
            "awaiting_confirm"
          );
        }
      }
    },
    [seedFromOcrTrigger]
  );

  const proofRenderHandlers = useRef({
    setDatePickerRequest,
    setReviewGatePhase: syncReviewGatePhase,
    onProofRenderApplied: (
      render: ProofUIRenderModel,
      proof: import("@/lib/event-os/causal-proof-types").CausalProof
    ) => {
      setEventOsProofRender(render);
      setEventOsLastProof(proof);
      eventOsLastProofRef.current = proof;
      ingestProof(proof);
    },
  });

  useEffect(() => {
    proofRenderHandlers.current.setDatePickerRequest = setDatePickerRequest;
    proofRenderHandlers.current.setReviewGatePhase = syncReviewGatePhase;
    proofRenderHandlers.current.onProofRenderApplied = (render, proof) => {
      setEventOsProofRender(render);
      setEventOsLastProof(proof);
      eventOsLastProofRef.current = proof;
      ingestProof(proof);
    };
  }, [ingestProof, syncReviewGatePhase]);

  const applyProofDrivenUi = useCallback(
    (
      proof: import("@/lib/event-os/causal-proof-types").CausalProof,
      uiEmit: import("@/lib/event-os/runtime/event-os-runtime-types").UiEmitFromProof | null,
      orchestrator: import("@/lib/action-chat/orchestrator-types").OrchestratorResult | null
    ) => {
      const handlers = proofRenderHandlers.current;
      if (uiEmit) {
        applyUiEmitToClient(proof, uiEmit, handlers);
        return;
      }
      applyProofOnlyToClient(proof, handlers, orchestrator);
    },
    []
  );


  useEffect(() => {
    const stored = readActionChatMessages(scopeId);
    setMessages(stored);
    const restored = resolveFeedPeerTalkSessionFromMessages(stored);
    if (restored && isFeedPeerTalkSendActive(restored, stored)) {
      setFeedPeerTalkSession(restored);
    } else {
      clearFeedPeerTalkSession();
    }
  }, [scopeId]);



  const persist = useCallback(

    (next: ActionChatMessage[]) => {

      setMessages(next);

      writeActionChatMessages(scopeId, next);

    },

    [scopeId]

  );

  const feedPeerTalkDeps = useCallback(
    () => ({
      readMessages: () => readActionChatMessages(scopeId),
      persist,
    }),
    [persist, scopeId],
  );

  const startFeedPeerTalk = useCallback(
    (contact: PeerContact) => {
      lastActivityRef.current = Date.now();
      return startFeedPeerTalkInFeed(feedPeerTalkDeps(), contact);
    },
    [feedPeerTalkDeps],
  );

  const sendFeedPeerTalk = useCallback(
    async (text: string, options?: { quietOnError?: boolean }) => {
      lastActivityRef.current = Date.now();
      const ok = await sendFeedPeerTalkInFeed(
        feedPeerTalkDeps(),
        text,
        options,
      );
      if (!ok && !options?.quietOnError) {
        throw new Error("대화를 다시 시작해 주세요 (@톡)");
      }
      return ok;
    },
    [feedPeerTalkDeps],
  );

  const feedPeerTalkSession = useSyncExternalStore(
    subscribeFeedPeerTalkSession,
    getFeedPeerTalkSession,
    () => null,
  );

  const sendComposerPayload = useCallback(
    (payload: { text: string; attachments?: ComposerAttachment[]; chatAxis?: ChatAxis }) => {
      if ((payload.attachments?.length ?? 0) > 0) {
        return false;
      }
      const masterContext = readClientMasterOrchestratorContext();
      const localTurn = tryDispatchLocalMentionTurn({
        text: payload.text,
        chatAxis: payload.chatAxis,
        activeLink: activeLink
          ? {
              id: activeLink.id,
              title: activeLink.title,
              original_url: activeLink.original_url,
            }
          : null,
        referenceDate: masterContext.currentDate,
        endPeerTalkDeps: feedPeerTalkDeps(),
      });
      if (localTurn) {
        persist([...readActionChatMessages(scopeId), ...localTurn]);
        return true;
      }
      return false;
    },
    [activeLink, feedPeerTalkDeps, persist, scopeId],
  );

  const startFreshConversation = useCallback(() => {
    const result = archiveAndClearChatSession(scopeId);
    clearAllActionChatMessageScopes();
    clearActiveChains();
    resetFeedPeerTalkSession();
    setMessages([]);
    resetThreadline();
    syncReviewGatePhase(null);
    setDatePickerRequest(null);
    lastActivityRef.current = Date.now();
    if (result.archived && result.topic) {
      toast(`기억에 저장했어요 · ${result.topic}`);
    }
  }, [resetThreadline, scopeId, syncReviewGatePhase]);

  useEffect(() => {
    if (messages.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current < SESSION_IDLE_MS) {
        return;
      }
      if (sending) {
        return;
      }
      startFreshConversation();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [messages.length, sending, startFreshConversation]);

  useEffect(() => {
    if (messages.length > 0) {
      lastActivityRef.current = Date.now();
    }
  }, [messages.length]);



  const fireScheduledAction = useCallback(
    async (messageId: string, extracted: ConfirmationExtractedData) => {
      completeChatScheduledEvent(messageId);
      const placeLabel = extracted.place_name ?? extracted.address ?? "목적지";

      if (shouldUseJITEventDelivery(extracted)) {
        const compiled = await compileJITTravelFire(extracted);
        if (compiled) {
          const current = readActionChatMessages(scopeId);
          persist(applyJITScheduledFire(current, messageId, extracted, compiled));
          toast(compiled.summary);
          return;
        }
      }

      const current = readActionChatMessages(scopeId);
      persist(applyScheduledFire(current, messageId, extracted));
      toast(`${placeLabel} 길찾기를 꺼냈어요`);
    },
    [persist, scopeId]
  );

  const activateScheduledDelivery = useCallback(
    async (input: {
      messageId: string;
      extracted: ConfirmationExtractedData;
      sourceMessage: string;
    }) => {
      await saveScheduledTravelToCalendar({
        extracted: input.extracted,
        sourceMessage: input.sourceMessage,
      });

      const placeLabel = input.extracted.place_name ?? input.extracted.address ?? "일정";
      const fireAt = input.extracted.datetime;
      if (!fireAt) {
        return;
      }

      const summary = formatScheduledDeliverySummary({
        placeLabel,
        fireAt,
        jit: shouldUseJITEventDelivery(input.extracted),
      });
      const current = readActionChatMessages(scopeId);

      persist(
        current.map((message) =>
          message.id === input.messageId
            ? {
                ...message,
                text: summary,
                actions: [],
                actionsRevealed: false,
                pendingConfirm: false,
                confirmation: undefined,
                scheduledDelivery: { fire_at: fireAt, status: "pending" },
                scheduleExtract: input.extracted,
              }
            : message
        )
      );

      armScheduledActionDelivery({
        scopeId,
        messageId: input.messageId,
        extracted: input.extracted,
        peerThreadId: feedPeerTalkSession?.peerThreadId ?? null,
        peerDisplayName: feedPeerTalkSession?.displayName ?? null,
        onFire: () => fireScheduledAction(input.messageId, input.extracted),
      });
    },
    [feedPeerTalkSession, fireScheduledAction, persist, scopeId]
  );

  const executeTimeChoice = useCallback(
    async (input: TimeChoiceExecuteInput) => {
      if (sending) {
        return;
      }

      const extracted: ConfirmationExtractedData = {
        datetime: input.datetime,
        place_name: input.task !== "일정" ? input.task : null,
        address: null,
        phone: null,
        url: null,
      };

      const userMessage = createMessage("user", input.prompt);
      const assistantMessage = createMessage("assistant", RIMVIO_CONVERSATION_LINES.loading);
      const current = readActionChatMessages(scopeId);
      persist([...current, userMessage, assistantMessage]);
      setSending(true);

      try {
        const runTimer = input.mode === "countdown" || input.mode === "both";

        if (runTimer) {
          await activateScheduledDelivery({
            messageId: assistantMessage.id,
            extracted,
            sourceMessage: input.prompt,
          });
          return;
        }

        await saveScheduledTravelToCalendar({
          extracted,
          sourceMessage: input.prompt,
        });

        const target = parseActionTargetDatetime(input.datetime);
        const clock = target
          ? target.toLocaleTimeString("ko-KR", {
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            })
          : input.datetime.replace("T", " ").slice(0, 16);

        const summary = `${clock} ${input.task} 일정을 저장했어요.`;
        persist(
          readActionChatMessages(scopeId).map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  text: summary,
                  loading: false,
                  scheduleExtract: extracted,
                }
              : message
          )
        );
        toast("일정을 저장했어요");
      } catch (error) {
        console.error("[action-chat] time choice execute failed", error);
        persist(
          readActionChatMessages(scopeId).map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  text: resolveClientRecoveryText(input.prompt),
                  loading: false,
                }
              : message
          )
        );
      } finally {
        setSending(false);
      }
    },
    [activateScheduledDelivery, persist, scopeId, sending]
  );

  const cancelScheduledAction = useCallback(
    (messageId: string) => {
      cancelChatScheduledEventDelivery(scopeId, messageId);
      const current = readActionChatMessages(scopeId);
      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                scheduledDelivery: undefined,
                scheduleExtract: undefined,
              }
            : message
        )
      );
      toast("예약을 취소했어요");
    },
    [persist, scopeId]
  );

  const triggerScheduledActionNow = useCallback(
    (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      const message = current.find((entry) => entry.id === messageId);
      const extracted = message?.scheduleExtract;
      if (!extracted) {
        return;
      }
      disarmScheduledActionDelivery(scopeId, messageId);
      fireScheduledAction(messageId, extracted);
    },
    [fireScheduledAction, scopeId]
  );

  useEffect(() => {
    restoreScheduledActionDeliveries({
      scopeId,
      onFire: (messageId, extracted) => {
        fireScheduledAction(messageId, extracted);
      },
    });
  }, [fireScheduledAction, scopeId]);



  useEffect(() => {

    const onRefresh = async (event: Event) => {

      const detail = (event as CustomEvent<{

        stopId?: string;

        routeId?: string;

        location?: string;

      }>).detail;



      try {

        const response = await fetch("/api/transport/live", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            stopId: detail?.stopId,

            routeNumber: detail?.routeId,

            location: detail?.location,

          }),

        });



        if (!response.ok) {

          return;

        }



        const payload = (await response.json()) as {

          card: ActionChatMessage["transportLive"];

          actions: ActionChatMessage["actions"];

          summary: string;

        };



        const current = readActionChatMessages(scopeId);

        persist(

          current.map((message) =>

            message.transportLive

              ? {

                  ...message,

                  transportLive: payload.card,

                  actions: payload.actions,

                  text: payload.summary,

                }

              : message

          )

        );

      } catch {

        // ignore refresh errors

      }

    };



    window.addEventListener("rimvio:transport-live-refresh", onRefresh);

    return () => window.removeEventListener("rimvio:transport-live-refresh", onRefresh);

  }, [persist, scopeId]);



  useEffect(() => {

    const context = readClientMasterOrchestratorContext();

    const nudge = evaluateProactiveTransportNudge({

      existingSchedule: context.existingSchedule,

    });

    if (!nudge) {

      return;

    }



    const flagKey = `rimvio:transport-nudge:${nudge.scheduleTime}:${nudge.scheduleTask}`;

    if (typeof window !== "undefined" && sessionStorage.getItem(flagKey)) {

      return;

    }



    const payload = buildTransportLiveOrchestratorPayload({

      message: `${nudge.routeHint}번 버스`,

      location: nudge.location,

      routeNumber: nudge.routeHint,

      calendarTitle: nudge.scheduleTask,

    });

    if (!payload) {

      return;

    }



    const current = readActionChatMessages(scopeId);

    if (current.some((message) => message.transportLive && message.text === nudge.message)) {

      return;

    }



    sessionStorage.setItem(flagKey, "1");

    persist([

      ...current,

      createMessage("assistant", nudge.message, {

        transportLive: payload.card,

        actions: payload.actions,

        actionsRevealed: true,

        confidence: 0.93,

        disclosure: "high",

      }),

    ]);

  }, [persist, scopeId]);



  const revealMessageActions = useCallback(

    (messageId: string) => {

      persist(revealAssistantMessage(readActionChatMessages(scopeId), messageId));

    },

    [persist, scopeId]

  );

  const revealAlternateMessageActions = useCallback(

    (messageId: string) => {

      persist(revealAlternateAssistantMessage(readActionChatMessages(scopeId), messageId));

    },

    [persist, scopeId]

  );

  const confirmPlace = useCallback(
    async (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const extracted = target?.confirmation?.extracted_data;
      if (!target || !extracted) {
        return;
      }

      const sourceMessage = findPriorUserInput(current, messageId) ?? "";
      ingestConfirmationSignal({
        sourceMessage,
        sourceMessageId: messageId,
        datetime: extracted.datetime,
        place: extracted.place_name ?? extracted.address ?? null,
        title: extracted.place_name ?? extracted.schedule_note ?? null,
      });

      if (shouldDeferActionsForSchedule(extracted)) {
        await activateScheduledDelivery({
          messageId,
          extracted,
          sourceMessage: findPriorUserInput(current, messageId) ?? "",
        });
        void appendCorrectionLog({
          user_input: findPriorUserInput(current, messageId) ?? "",
          ai_inferred_location: extracted.address,
          ai_inferred_place_name: extracted.place_name,
          user_corrected_location: extracted.address,
          user_corrected_place_name: extracted.place_name,
          outcome: "accepted",
        }).then((row) => void savePlacePreferenceToKnowledge(row));
        return;
      }

      const flushReport = await flushBatchPendingTransactionally(
        target.confirmation?.batch_pending
      );

      const hadScheduleFlush = flushReport.succeeded.some(
        (item) => item.type === "DATETIME" || item.type === "SCHEDULE"
      );
      if (hadScheduleFlush) {
        ingestScheduleSignal({
          sourceMessage,
          sourceMessageId: messageId,
          datetime: extracted.datetime,
          place: extracted.place_name ?? extracted.address ?? null,
          title: extracted.place_name ?? extracted.schedule_note ?? null,
        });
      }

      const placeLabel = extracted.place_name ?? extracted.address ?? "선택한 장소";
      const summary =
        flushReport.failed.length > 0
          ? flushReport.summary
          : flushReport.summary || `${placeLabel}로 진행할게요.`;

      const next = applyPlaceConfirmation(
        clearConfirmInterrupt(current, messageId),
        messageId,
        extracted,
        summary,
        flushReport
      );
      persist(next);

      if (flushReport.hasPartialFailure || flushReport.failed.length > 0) {
        toast(flushReport.summary, {
          description:
            flushReport.failed.length > 0
              ? "실패한 항목은 다시 시도해 주세요."
              : undefined,
        });
      }

      void appendCorrectionLog({
        user_input: findPriorUserInput(current, messageId) ?? "",
        ai_inferred_location: extracted.address,
        ai_inferred_place_name: extracted.place_name,
        user_corrected_location: extracted.address,
        user_corrected_place_name: extracted.place_name,
        outcome: "accepted",
      }).then((row) => void savePlacePreferenceToKnowledge(row));
      void appendSearchActivity({
        query: extracted.place_name ?? extracted.address ?? "선택한 장소",
        kind: "place_pick",
        place_label: extracted.place_name,
        address: extracted.address,
      });
    },
    [activateScheduledDelivery, persist, scopeId]
  );

  const correctPlace = useCallback(
    async (messageId: string, suggestion: LocationSuggestion) => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const prior = target?.confirmation?.extracted_data;
      if (!target || !prior) {
        return;
      }

      const extracted: ConfirmationExtractedData = {
        ...prior,
        place_name: suggestion.place_name,
        address: suggestion.address,
      };

      const sourceMessage = findPriorUserInput(current, messageId) ?? "";
      ingestConfirmationSignal({
        sourceMessage,
        sourceMessageId: messageId,
        datetime: extracted.datetime,
        place: extracted.place_name ?? extracted.address ?? null,
        title: extracted.place_name ?? extracted.schedule_note ?? null,
      });

      if (shouldDeferActionsForSchedule(extracted)) {
        await activateScheduledDelivery({
          messageId,
          extracted,
          sourceMessage: findPriorUserInput(current, messageId) ?? "",
        });
        return;
      }

      const flushReport = await flushBatchPendingTransactionally(
        target.confirmation?.batch_pending
      );

      if (
        flushReport.succeeded.some(
          (item) => item.type === "DATETIME" || item.type === "SCHEDULE"
        )
      ) {
        ingestScheduleSignal({
          sourceMessage,
          sourceMessageId: messageId,
          datetime: extracted.datetime,
          place: extracted.place_name ?? extracted.address ?? null,
          title: extracted.place_name ?? extracted.schedule_note ?? null,
        });
      }

      const next = applyPlaceConfirmation(
        clearConfirmInterrupt(current, messageId),
        messageId,
        extracted,
        flushReport.failed.length > 0
          ? flushReport.summary
          : `${suggestion.label}로 선택했어요.`,
        flushReport
      );
      persist(next);

      if (flushReport.failed.length > 0) {
        toast(flushReport.summary);
      }

      void appendCorrectionLog({
        user_input: findPriorUserInput(current, messageId) ?? "",
        ai_inferred_location: prior.address,
        ai_inferred_place_name: prior.place_name,
        user_corrected_location: suggestion.address,
        user_corrected_place_name: suggestion.place_name,
        outcome: "corrected",
      }).then((row) => void savePlacePreferenceToKnowledge(row));
      void appendSearchActivity({
        query: suggestion.label,
        kind: "place_pick",
        place_label: suggestion.place_name,
        address: suggestion.address,
      });
    },
    [activateScheduledDelivery, persist, scopeId]
  );

  const resumeConfirmInterrupt = useCallback(
    (messageId: string) => {
      persist(clearConfirmInterrupt(readActionChatMessages(scopeId), messageId));
    },
    [persist, scopeId]
  );

  const dismissConfirmForInterrupt = useCallback(
    (messageId: string): string | null => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const interruptText = target?.confirmation?.interrupt?.user_message?.trim() ?? null;

      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                pendingConfirm: false,
                confirmation: undefined,
                text: "알겠어요. 다른 질문부터 도와드릴게요.",
              }
            : message
        )
      );

      return interruptText;
    },
    [persist, scopeId]
  );

  const WITTY_ACTION_REPLIES: Record<string, string> = {
    feed_knowledge:
      "좋아요! 뭐든 말해 주세요 — 그게 제 지식이 되고, 함께 자라요. 😊",
    compliment: "고마워요! 당신과 나, 둘 다 계속 자라면 되죠. 🌱",
    play_along: "좋아요! 편하게 말 걸어 주세요. 심심할 땐 저랑 잡담도 재밌어요.",
  };

  const handleWittyAction = useCallback(
    (messageId: string, action: string) => {
      const current = readActionChatMessages(scopeId);
      const reply =
        WITTY_ACTION_REPLIES[action] ?? "알겠어요! 더 이야기해 볼까요?";

      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                pendingConfirm: false,
                confirmation: undefined,
                thought: undefined,
                text: reply,
              }
            : message
        )
      );
    },
    [persist, scopeId]
  );

  const applyReviewGateFromOrchestrator = useCallback(
    (payload: OrchestratorResultWire | null | undefined) => {
      const route = payload?.meta?.execution_route;
      if (
        route === "EVENT_REVIEW_DATE_PICKER" ||
        payload?.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER"
      ) {
        syncReviewGatePhase("awaiting_date");
        syncThreadlineFromOrchestrator(payload);
        return;
      }
      if (route === "EVENT_REVIEW_DATE_CONFIRM") {
        syncReviewGatePhase("awaiting_confirm");
        syncThreadlineFromOrchestrator(payload);
        return;
      }
      if (route === "CALENDAR_COMMIT" || route === "REVIEW_REJECT") {
        syncReviewGatePhase(null);
      }
    },
    [syncReviewGatePhase, syncThreadlineFromOrchestrator]
  );

  const runReviewExecutionAndPersist = useCallback(
    async (input: ReviewExecutionInput, userText: string) => {
      setSending(true);
      const current = readActionChatMessages(scopeId);
      const userMessage = createMessage("user", userText);
      const loadingId = `loading-${Date.now()}`;
      persist([
        ...current,
        userMessage,
        createMessage("assistant", "…", { id: loadingId }),
      ]);

      try {
        const result = await submitReviewExecution({
          ...input,
          scopeId: REVIEW_EXECUTION_SCOPE,
        });
        const payload =
          orchestratorFromReviewProcess(result) ?? result.orchestrator ?? null;
        const proof = proofFromReviewProcess(result);
        const uiEmit = uiEmitFromReviewProcess(result);

        if (proof) {
          applyProofDrivenUi(proof, uiEmit, payload);
        } else {
          applyReviewGateFromOrchestrator(payload);
          if (payload?.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER") {
            setDatePickerRequest(payload.uiTrigger);
          } else if (payload?.uiTrigger?.type === "DATE_PICKER") {
            setDatePickerRequest(payload.uiTrigger);
          }
        }

        applyReviewExecutionClientIngress(payload);

        const assistantMessage = createMessage(
          "assistant",
          payload?.summary || resolveClientRecoveryText(userText),
          {
            actions: payload?.actions ?? [],
            confidence: payload?.confidence,
            disclosure: payload?.disclosure,
            actionsRevealed: payload?.actionsRevealed ?? false,
            pendingConfirm: payload?.pendingConfirm ?? false,
            metadata: payload?.metadata,
            meta: payload?.meta,
            uiTrigger: payload?.uiTrigger,
          }
        );

        persist([
          ...readActionChatMessages(scopeId).filter(
            (message) => message.id !== loadingId
          ),
          assistantMessage,
        ]);
        return true;
      } catch (error) {
        console.error("[action-chat] review execution failed", error);
        persist([
          ...readActionChatMessages(scopeId).filter(
            (message) => message.id !== loadingId
          ),
          createMessage("assistant", resolveClientRecoveryText(userText)),
        ]);
        return false;
      } finally {
        setSending(false);
      }
    },
    [applyProofDrivenUi, applyReviewGateFromOrchestrator, persist, scopeId]
  );

  const buildStudyAuxDeps = useCallback(
    () => ({
      readMessages: () => readActionChatMessages(scopeId),
      persist,
      setDatePickerRequest,
      sendMessage: (prompt: string) => sendMessageRef.current(prompt),
      toastSuccess: (message: string, description?: string) => {
        toast.success(message, description ? { description } : undefined);
      },
    }),
    [persist, scopeId],
  );

  const handleStudyAuxAction = useCallback(
    async (kind: StudyAuxKind) => {
      await executeStudyAuxClient(kind, buildStudyAuxDeps());
    },
    [buildStudyAuxDeps],
  );

  const sendMessage = useCallback(

    async (
      text: string,
      options?: { attachments?: ComposerAttachment[]; chatAxis?: ChatAxis }
    ) => {

      const turnIntent = parseTurnIntent(text, options, readStoredChatAxis);
      const { trimmed, pendingAttachments } = turnIntent;

      if (trimmed && isRimvioPromptUri(trimmed)) {
        const handled = routeRimvioPromptUri(trimmed, {
          sendMessage: (nl) => {
            void sendMessageRef.current(nl, options);
          },
        });
        if (handled) {
          return;
        }
      }

      const currentBeforeSend = readActionChatMessages(scopeId);
      syncFeedPeerTalkSessionWithMessages(currentBeforeSend);

      const peerTalkSession =
        getFeedPeerTalkSession() ??
        resolveFeedPeerTalkSessionFromMessages(currentBeforeSend);
      if (peerTalkSession && !getFeedPeerTalkSession()) {
        setFeedPeerTalkSession(peerTalkSession);
      }
      const routeToFeedPeerTalk =
        isFeedPeerTalkSendActive(peerTalkSession, currentBeforeSend) &&
        pendingAttachments.length === 0 &&
        trimmed &&
        !trimmed.startsWith("@");

      const clientRoute = resolveClientTurnRoute({
        sending,
        turnIntent,
        pendingAttachments,
        messages: currentBeforeSend,
        routeToFeedPeerTalk: Boolean(routeToFeedPeerTalk && peerTalkSession),
        reviewGatePhase: reviewGatePhaseRef.current,
      });

      if (clientRoute.kind === "noop") {
        return;
      }

      let messageChatAxis: ChatAxis = turnIntent.chatAxis;
      let axisOrchestrateOverride: string | null = turnIntent.axisOrchestrateOverride;

      if (clientRoute.kind === "peer_talk" && peerTalkSession) {
        const sent = await sendFeedPeerTalkInFeed(
          { readMessages: () => readActionChatMessages(scopeId), persist },
          trimmed,
        );
        if (sent) {
          return;
        }
        // DM 실패 시 AI 오케스트레이터로 넘기지 않음 (톡 안 간 채 피드만 도는 현상 방지)
        return;
      }
      if (clientRoute.kind === "parking_photo" && pendingAttachments.length > 0) {
        consumeParkingPhotoCapture();
        const photoTurn = await tryCommitParkingPhotoTurn({
          attachments: pendingAttachments,
          chatAxis: messageChatAxis,
        });
        if (photoTurn) {
          persist([...readActionChatMessages(scopeId), ...photoTurn]);
          return;
        }
      }

      if (pendingAttachments.length === 0) {
        const earlyMasterContext = readClientMasterOrchestratorContext();
        const earlyLocalTurn = tryDispatchLocalMentionTurn({
          text: trimmed,
          chatAxis: messageChatAxis,
          activeLink: activeLink
            ? {
                id: activeLink.id,
                title: activeLink.title,
                original_url: activeLink.original_url,
              }
            : null,
          referenceDate: earlyMasterContext.currentDate,
          endPeerTalkDeps: feedPeerTalkDeps(),
        });
        if (earlyLocalTurn) {
          persist([...readActionChatMessages(scopeId), ...earlyLocalTurn]);
          return;
        }

        const axisContext = resolveMentionAxisSendContext(trimmed, messageChatAxis);
        messageChatAxis = axisContext.chatAxis;
        axisOrchestrateOverride = axisContext.orchestrateMessageOverride;
        if (axisContext.hintTurn) {
          persist([...readActionChatMessages(scopeId), ...axisContext.hintTurn]);
          return;
        }
      }

      if (
        clientRoute.kind === "lecture_url" &&
        tryConsumeLectureUrlRegistration(trimmed, buildStudyAuxDeps())
      ) {
        return;
      }

      const studyLabelKind = resolveStudyAuxFromLabel(trimmed);
      if (clientRoute.kind === "study_label" && studyLabelKind) {
        const current = readActionChatMessages(scopeId);
        persist([
          ...current,
          createMessage("user", trimmed, { chatAxis: messageChatAxis }),
        ]);
        void handleStudyAuxAction(studyLabelKind);
        return;
      }

      const studyQaTurn = isStudyQaModeActive();

      if (clientRoute.kind === "command_os") {
        setSending(true);
        const current = readActionChatMessages(scopeId);
        const userMessage = createMessage("user", trimmed);
        const loadingId = `loading-${Date.now()}`;
        persist([
          ...current,
          userMessage,
          createMessage("assistant", "…", { id: loadingId }),
        ]);
        try {
          const compiled = await submitCommandCompile(trimmed);
          const payload = compiled.orchestrator ?? null;
          const proof = compiled.proof ?? compiled.runtime?.processed[0]?.proof ?? null;
          const uiEmit = compiled.uiEmit;

          if (proof) {
            applyProofDrivenUi(proof, uiEmit ?? null, payload);
          }
          applyReviewExecutionClientIngress(payload);

          persist([
            ...readActionChatMessages(scopeId).filter(
              (message) => message.id !== loadingId
            ),
            createMessage(
              "assistant",
              payload?.summary ??
                compiled.candidate.normalizedQuery,
              {
                actions: payload?.actions ?? [],
                confidence: payload?.confidence,
                metadata: mergeOrchestratorMetadata(payload?.metadata, {
                  command_os_candidate: compiled.candidate,
                }),
                meta: payload?.meta,
                uiTrigger: payload?.uiTrigger,
              }
            ),
          ]);
        } catch (error) {
          console.error("[action-chat] command compile failed", error);
          persist([
            ...readActionChatMessages(scopeId).filter(
              (message) => message.id !== loadingId
            ),
            createMessage("assistant", resolveClientRecoveryText(trimmed)),
          ]);
        } finally {
          setSending(false);
        }
        return;
      }

      if (clientRoute.kind === "ocr_review_dates") {
        await runReviewExecutionAndPersist(
          {
            scopeId: REVIEW_EXECUTION_SCOPE,
            type: "date",
            payload: {
              patches: JSON.parse(
                trimmed.slice(OCR_REVIEW_DATES_PREFIX.length)
              ).patches,
            },
          },
          "날짜 선택"
        );
        return;
      }

      if (clientRoute.kind === "review_approval") {
        const approvalAct = classifyApprovalSpeechAct(trimmed);
        if (approvalAct !== "APPROVE") {
          return;
        }
        if (
          reviewGatePhaseRef.current &&
          pendingAttachments.length === 0
        ) {
        const stepType =
          reviewGatePhaseRef.current === "awaiting_confirm" ? "confirm" : "approve";
        const handled = await runReviewExecutionAndPersist(
          {
            scopeId: REVIEW_EXECUTION_SCOPE,
            type: stepType,
            payload: {
              message: trimmed,
              syncClient: stepType === "confirm",
            },
          },
          trimmed
        );
        if (handled) {
          return;
        }
        }
      }

      const routedText = axisOrchestrateOverride ?? trimmed;
      let orchestrateMessage = routedText;
      let composerContext: string | undefined;
      let composerAttachments = undefined as
        | ActionChatMessage["composerAttachments"]
        | undefined;

      if (pendingAttachments.length > 0) {
        try {
          const resolved = await resolveComposerAttachments(pendingAttachments);
          composerContext = resolved.contextBlock || undefined;
          composerAttachments = resolved.displayAttachments;
          orchestrateMessage = buildComposerOrchestrateMessage({
            text: routedText,
            contextBlock: resolved.contextBlock,
          });
          if (resolved.linkUrls.length > 0) {
            void ingestPastedLinks(resolved.linkUrls.join("\n"));
          }
          revokeComposerAttachmentUrls(pendingAttachments);
        } catch (attachmentError) {
          console.error("[action-chat] attachment resolve failed", attachmentError);
          orchestrateMessage = routedText;
        }
      }

      const peerContext = buildPeerComposerContextBlock(routedText);
      if (peerContext.block) {
        composerContext = [composerContext, peerContext.block]
          .filter(Boolean)
          .join("\n\n");
      }
      if (peerContext.blockedTokens.length > 0) {
        const notPinned = peerContext.blockedTokens.filter(
          (b) => b.reason === "not_pinned"
        );
        if (notPinned.length > 0) {
          toast.message(
            `고정된 친한 친구 5명에게만 @연결할 수 있어요 (${notPinned.map((b) => `@${b.token}`).join(", ")})`
          );
        }
      }

      const actionMention = parseMentionAxisInput(trimmed)
        ? null
        : parseActionMention(trimmed);
      if (
        actionMention &&
        !isLocalInlineMentionFeature(actionMention.feature.featureId)
      ) {
        composerContext = [composerContext, formatMentionComposerBlock(actionMention)]
          .filter(Boolean)
          .join("\n\n");
      }

      if (pendingAttachments.length === 0) {
        const masterContext = readClientMasterOrchestratorContext();
        const localTurn = tryDispatchLocalMentionTurn({
          text: trimmed,
          chatAxis: messageChatAxis,
          activeLink: activeLink
            ? {
                id: activeLink.id,
                title: activeLink.title,
                original_url: activeLink.original_url,
              }
            : null,
          referenceDate: masterContext.currentDate,
          endPeerTalkDeps: feedPeerTalkDeps(),
        });
        if (localTurn) {
          persist([...readActionChatMessages(scopeId), ...localTurn]);
          return;
        }
      }

      lastActivityRef.current = Date.now();

      if (!activeLink) {
        clearActiveChains();
      }

      const current = readActionChatMessages(scopeId);

      const userMessage = createMessage("user", trimmed || "첨부 자료", {
        composerAttachments,
        chatAxis: messageChatAxis,
      });

      submitLiveTurn({
        stage: "input",
        userMessage: trimmed || "첨부 자료",
        messageId: userMessage.id,
        chatAxis: messageChatAxis,
      });

      const pendingPlaceConfirm = findPendingPlaceConfirm(current);
      if (pendingPlaceConfirm) {
        const interruptKind = classifyConfirmInterrupt(trimmed);

        if (interruptKind === "continue_confirm") {
          persist([...current, userMessage]);
          void confirmPlace(pendingPlaceConfirm.id);
          return;
        }

        if (interruptKind === "cancel_task") {
          persist(cancelPendingConfirm(current, pendingPlaceConfirm.id, userMessage));
          return;
        }

        if (interruptKind === "system_query") {
          persist(
            respondToConfirmSystemQuery(current, pendingPlaceConfirm.id, userMessage)
          );
          return;
        }

        if (interruptKind === "location_correction") {
          const referenceDate =
            readClientMasterOrchestratorContext().currentDate ??
            new Date().toISOString().slice(0, 10);
          const corrected = buildLocationCorrectionFromInput(
            trimmed,
            pendingPlaceConfirm.confirmation?.extracted_data,
            referenceDate
          );
          persist(
            applyLocationCorrectionToConfirm(
              current,
              pendingPlaceConfirm.id,
              userMessage,
              corrected
            )
          );
          return;
        }

        if (interruptKind === "off_topic") {
          persist(
            attachConfirmInterrupt(current, pendingPlaceConfirm.id, userMessage, trimmed)
          );
          return;
        }
      }

      if (isUserConfirmingActions(trimmed)) {
        const pendingScheduleConfirm = findPendingConfirmation(current);
        if (pendingScheduleConfirm) {
          persist([...current, userMessage]);
          void confirmPlace(pendingScheduleConfirm.id);
          return;
        }

        const pending = [...current]

          .reverse()

          .find(

            (message) =>

              message.role === "assistant" &&

              message.pendingConfirm &&

              !message.actionsRevealed &&

              (message.actions?.length ?? 0) > 0

          );



        if (pending) {

          persist([

            ...revealAssistantMessage(current, pending.id),

            userMessage,

          ]);

          return;

        }

      }

      if (isUserRequestingAlternate(trimmed)) {

        const pending = [...current]

          .reverse()

          .find(

            (message) =>

              message.role === "assistant" &&

              message.pendingConfirm &&

              !message.actionsRevealed &&

              (message.actions?.length ?? 0) > 1

          );



        if (pending) {

          persist([

            ...revealAlternateAssistantMessage(current, pending.id),

            userMessage,

          ]);

          return;

        }

      }



      const loadingId = crypto.randomUUID();

      const loadingMessage = createMessage("assistant", RIMVIO_CONVERSATION_LINES.loading, {

        id: loadingId,

        loading: true,

      });



      const base = [...current, userMessage, loadingMessage];

      persist(base);

      setSending(true);

      const turnStartedAt = Date.now();

      try {
        await executeOrchestrateTurn(
          {
            scopeId,
            trimmed,
            orchestrateMessage,
            composerContext,
            messageChatAxis,
            base,
            loadingId,
            userMessage,
            activeLink,
            chainedLinks,
            studyQaTurn,
            turnStartedAt,
          },
          {
            persist,
            createMessage,
            applyReviewGateFromOrchestrator,
            syncThreadlineFromOrchestrator,
            setDatePickerRequest,
            activateScheduledDelivery,
            buildStudyAuxDeps,
          },
        );
        return;
      } catch (error) {

        console.error("[action-chat] send failed", error);

        const fallbackText =

          error instanceof FetchTimeoutError

            ? RIMVIO_CONVERSATION_LINES.timeout

            : resolveClientRecoveryText(trimmed);



        persist([

          ...base.filter((message) => message.id !== loadingId),

          createMessage("assistant", fallbackText),

        ]);

      } finally {

        setSending(false);

      }

    },

    [
      activateScheduledDelivery,
      activeLink,
      applyReviewGateFromOrchestrator,
      buildStudyAuxDeps,
      handleStudyAuxAction,
      chainedLinks,
      confirmPlace,
      persist,
      runReviewExecutionAndPersist,
      scopeId,
      sending,
      syncThreadlineFromOrchestrator,
    ]

  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const selectArea = useCallback(
    (_messageId: string, suggestion: LocationSuggestion) => {
      const searchQuery = suggestion.place_name.trim() || suggestion.label.trim();
      if (!searchQuery) {
        return;
      }
      recordRecentAreaPick(scopeId, {
        label: suggestion.label.trim() || searchQuery,
        search_query: searchQuery,
      });
      void sendMessage(searchQuery);
    },
    [scopeId, sendMessage],
  );

  const dismissDatePicker = useCallback(() => {
    setDatePickerRequest(null);
  }, []);

  const completeInlineTimer = useCallback(
    (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      let updated = false;
      const next = current.map((message) => {
        if (message.id !== messageId || !message.inlineChatTimer) {
          return message;
        }
        if (message.inlineChatTimer.status === "done") {
          return message;
        }
        updated = true;
        return {
          ...message,
          inlineChatTimer: {
            ...message.inlineChatTimer,
            status: "done" as const,
          },
        };
      });
      if (updated) {
        persist(next);
        toast.message("타이머 끝");
      }
    },
    [persist, scopeId],
  );

  const confirmInlineFocus = useCallback(
    async (messageId: string) => {
      const hasAccess = await ensureNotificationAccessForFocus(() => {
        toast.message("알림 맡기기", {
          description: "설정에서 Rimvio 알림 접근을 켜주세요",
        });
      });
      const current = readActionChatMessages(scopeId);
      persist(applyFocusConfirmToMessages(current, messageId));
      toast.message("집중 모드 시작", {
        description: hasAccess
          ? "카카오톡·이메일 알림을 모아둘게요"
          : "알림 권한을 켜면 카톡·이메일도 모아둘 수 있어요",
      });
    },
    [persist, scopeId],
  );

  const cancelInlineFocus = useCallback(
    (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      persist(applyFocusCancelToMessages(current, messageId));
    },
    [persist, scopeId],
  );

  const completeInlineFocus = useCallback(
    (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      if (!target?.inlineChatFocus || target.inlineChatFocus.phase !== "running") {
        return;
      }
      persist(applyFocusCompleteToMessages(current, messageId));
      toast.message("집중 끝", {
        description: "모아둔 알림을 여기서 처리하세요",
      });
    },
    [persist, scopeId],
  );

  const handleFocusHeldInAppAction = useCallback(
    (messageId: string, shadowId: string, action: FocusHeldActionWire) => {
      if (action.kind === "open_embedded") {
        return;
      }

      if (action.kind === "confirm") {
        const current = readActionChatMessages(scopeId);
        persist(applyFocusHeldInAppActionToMessages(current, messageId, shadowId));
        return;
      }

      if (action.kind === "reply_draft" && action.target) {
        const current = readActionChatMessages(scopeId);
        persist(applyFocusHeldInAppActionToMessages(current, messageId, shadowId));
        void sendMessage(action.target);
        return;
      }

      if (action.kind === "open_external" && action.target) {
        openSpawnAction({
          deeplink: action.target,
          onPrompt: (uri) => {
            if (routeRimvioPromptUri(uri, { sendMessage: (nl) => void sendMessage(nl) })) {
              return;
            }
            void sendMessage(uri);
          },
        });
      }
    },
    [persist, scopeId, sendMessage],
  );

  const submitHitRunFeedback = useCallback(
    async (messageId: string, verdict: HitRunFeedbackVerdict) => {
      const current = readActionChatMessages(scopeId);
      const index = current.findIndex((message) => message.id === messageId);
      if (index < 0) {
        return;
      }

      const assistant = current[index];
      if (assistant.role !== "assistant" || assistant.loading) {
        return;
      }

      let userMessage = "";
      let chatAxis = assistant.chatAxis;
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const prior = current[cursor];
        if (prior.role === "user") {
          userMessage = prior.text;
          chatAxis = chatAxis ?? prior.chatAxis;
          break;
        }
      }

      persist(
        current.map((message) =>
          message.id === messageId
            ? { ...message, hitRunFeedback: verdict }
            : message
        )
      );

      try {
        await fetch("/api/chat/hit-run-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verdict,
            messageId,
            userMessage,
            assistantSummary: assistant.text,
            chatAxis: chatAxis ?? null,
            metadata: assistant.metadata ?? {},
          }),
        });
      } catch (error) {
        console.error("[action-chat] hit-run feedback failed", error);
      }
    },
    [persist, scopeId]
  );

  const togglePackingItem = useCallback(
    (tripId: string, itemId: string) => {
      const result = handlePackingItemToggle({ tripId, itemId });
      if (!result?.packingChecklist) {
        return;
      }

      const current = readActionChatMessages(scopeId);
      const hasChecklistMessage = current.some(
        (message) => message.packingChecklist?.tripId === tripId
      );

      if (hasChecklistMessage) {
        persist(
          current.map((message) =>
            message.packingChecklist?.tripId === tripId
              ? {
                  ...message,
                  text: result.summary,
                  packingChecklist: result.packingChecklist,
                  actions: result.actions ?? [],
                  actionsRevealed: result.actionsRevealed ?? false,
                }
              : message
          )
        );
        return;
      }

      persist([
        ...current,
        createMessage("assistant", result.summary, {
          packingChecklist: result.packingChecklist,
          actions: result.actions ?? [],
          actionsRevealed: result.actionsRevealed ?? false,
          presentation: result.presentation,
          metadata: result.metadata,
        }),
      ]);
    },
    [persist, scopeId]
  );

  const confirmDatePicker = useCallback(
    async (input: { date: string; time: string; task: string }) => {
      const label = `${input.date} ${input.time}`;
      await saveKnowledgeEntity({
        containerId: FIXED_CALENDAR_CONTAINER_ID,
        type: "schedule",
        label: input.task,
        value: label,
        sourceMessage: input.task,
      });
      setDatePickerRequest(null);
      void sendMessage(`${input.date} ${input.time} ${input.task} 일정 잡아줘`);
    },
    [sendMessage]
  );

  const confirmOcrReviewDates = useCallback(
    async (patches: Array<{ candidateId: string; date: string }>) => {
      setDatePickerRequest(null);
      await runReviewExecutionAndPersist(
        {
          scopeId: REVIEW_EXECUTION_SCOPE,
          type: "date",
          payload: { patches },
        },
        "날짜 선택"
      );
    },
    [runReviewExecutionAndPersist]
  );

  useEffect(() => {
    eventOsLastProofRef.current = eventOsLastProof;
  }, [eventOsLastProof]);

  useEffect(() => {
    threadlineResolveRef.current = async (payload) => {
      switch (payload.kind) {
        case "ocr_date":
          await confirmOcrReviewDates(payload.patches);
          break;
        case "ocr_confirm":
          await runReviewExecutionAndPersist(
            {
              scopeId: REVIEW_EXECUTION_SCOPE,
              type: "confirm",
              payload: {
                message: payload.message,
                syncClient: true,
              },
            },
            payload.message
          );
          break;
        case "ocr_approve":
          await runReviewExecutionAndPersist(
            {
              scopeId: REVIEW_EXECUTION_SCOPE,
              type: "approve",
              payload: { message: payload.message },
            },
            payload.message
          );
          break;
        case "open_date_picker": {
          const proof = eventOsLastProofRef.current;
          const pending = proof?.stateAfter.pendingCandidates ?? [];
          if (pending.length > 0) {
            setDatePickerRequest({
              type: "OCR_REVIEW_DATE_PICKER",
              rows: pending.map((row) => ({
                candidateId: row.id,
                title: row.title,
                time: row.time,
              })),
            });
            syncReviewGatePhase("awaiting_date");
          }
          break;
        }
        case "defer":
          setDatePickerRequest(null);
          syncReviewGatePhase(null);
          break;
        default:
          break;
      }
    };
  }, [
    confirmOcrReviewDates,
    runReviewExecutionAndPersist,
    syncReviewGatePhase,
  ]);

  return {

    messages,

    sending,

    sendMessage,

    sendComposerPayload,

    submitHitRunFeedback,

    completeInlineTimer,

    confirmInlineFocus,

    cancelInlineFocus,

    completeInlineFocus,

    handleFocusHeldInAppAction,

    revealMessageActions,

    revealAlternateMessageActions,

    datePickerRequest,

    eventOsProofRender,

    eventOsLastProof,

    threadlineCards,

    deferredCards,

    handleThreadlineResolveChip,

    restoreThreadlineDeferred: restoreDeferred,

    confirmDatePicker,

    confirmOcrReviewDates,

    dismissDatePicker,

    togglePackingItem,

    confirmPlace,

    correctPlace,

    selectArea,

    chatScopeId: scopeId,

    resumeConfirmInterrupt,

    dismissConfirmForInterrupt,

    handleWittyAction,

    cancelScheduledAction,

    triggerScheduledActionNow,

    executeTimeChoice,

    handleStudyAuxAction,

    startFreshConversation,

    feedPeerTalkSession,

    startFeedPeerTalk,

    sendFeedPeerTalk,

  };

}



type OrchestratorResultWire = {

  summary: string;

  actions?: ActionChatMessage["actions"];

  confidence?: number;

  disclosure?: ActionChatMessage["disclosure"];

  actionsRevealed?: boolean;

  pendingConfirm?: boolean;

  metadata?: ActionChatMessage["metadata"];

  goalSnapshot?: ActionChatMessage["goalSnapshot"];

  meta?: ActionChatMessage["meta"];

  schedule?: ActionChatMessage["schedule"];

  container?: ActionChatMessage["container"];

  transportLive?: ActionChatMessage["transportLive"];

  uiTrigger?: ActionChatMessage["uiTrigger"];

  knowledgeSaved?: ActionChatMessage["knowledgeSaved"];

  confirmation?: ActionChatMessage["confirmation"];

  thought?: ActionChatMessage["thought"];

  scheduledDelivery?: ActionChatMessage["scheduledDelivery"];

  scheduleExtract?: ActionChatMessage["scheduleExtract"];

  cafeDiscovery?: ActionChatMessage["cafeDiscovery"];

  guardrail?: ActionChatMessage["guardrail"];

  policy?: ActionChatMessage["policy"];

  experienceChoice?: ActionChatMessage["experienceChoice"];

  entityQuickPick?: ActionChatMessage["entityQuickPick"];

  scheduleAdvisory?: ActionChatMessage["scheduleAdvisory"];

  morningBriefing?: ActionChatMessage["morningBriefing"];

  presentation?: ActionChatMessage["presentation"];

  flightStatusCard?: ActionChatMessage["flightStatusCard"];

  packingChecklist?: ActionChatMessage["packingChecklist"];

  actionOsDock?: ActionChatMessage["actionOsDock"];

  dataArchitect?: ActionChatMessage["dataArchitect"];

  globalBrain?: {
    userStatusPatch?: import("@/lib/global-brain/types").UserStatusWire | null;
    preferencePatch?: { key: string; value: string; label: string } | null;
    nexusContactTouch?: { name: string } | null;
    actionEventUpsert?: import("@/lib/global-brain/types").GlobalBrainWire["actionEventUpsert"];
  };

  eventCandidateUpsert?: import("@/lib/events/event-candidate").EventCandidateWire;

  eventCandidateUpserts?: import("@/lib/events/event-candidate").EventCandidateWire[];

  batchResults?: Array<{
    type: string;
    summary: string;
    actions?: ActionChatMessage["actions"];
    extracted_data: Record<string, string | null>;
  }>;

};


