import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { serializeMasterContextForApi } from "@/lib/action-chat/client-master-context";
import { applyUserStatusPatchFromApi } from "@/lib/global-brain/user-status-store";
import { applyPreferencePatchFromApi } from "@/lib/preference/preference-store";
import { touchNexusContact } from "@/lib/nexus-db/contact-store";
import { applyEventCandidateUpsertFromApi } from "@/lib/events/emit-event-candidate";
import { applyOcrCalendarCommitToClient } from "@/lib/event-kernel/review/sync-ocr-commit-to-client";
import { resolveAssistantDisplaySummary } from "@/lib/action-chat/resolve-assistant-display-summary";
import { parseTikiChoiceOptions } from "@/lib/action-chat/parse-tiki-choice-options";
import {
  readVitalityMemory,
  writeVitalityMemory,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-memory-client";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";
import { publishGoalSnapshotFromTurn } from "@/lib/goal-engine/goal-snapshot-session";
import { buildLocationMemoryWire } from "@/lib/location-memory/format-life-zone-context";
import {
  appendSearchActivity,
  listSearchActivities,
} from "@/lib/location-memory/search-activity-log";
import {
  inferSearchActivityKind,
  shouldLogSearchActivity,
} from "@/lib/location-memory/log-search-activity";
import { listCorrectionLogs } from "@/lib/corrections/correction-log";
import { resolvePriorPlaceChoice } from "@/lib/corrections/prior-place-choice";
import { buildPlacePreferencesWire } from "@/lib/corrections/place-preference-knowledge";
import { buildLinkedLinksWire } from "@/lib/feed/link-context-chain";
import { submitLiveTurn } from "@/lib/self-learning/submit-live-turn-client";
import {
  executeStudyAuxClient,
  readAutoExecuteStudyAux,
  appendStudyQaFollowUpIfNeeded,
} from "@/lib/contextual-aux/study/execute-study-aux-client";
import type { StudyAuxKind } from "@/lib/contextual-aux/study/types";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { LinkRow } from "@/types/database";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import { toast } from "sonner";
import { saveScheduledTravelToCalendar } from "@/lib/action-chat/scheduled-action-delivery";
import { historyContentFromMessage } from "@/lib/action-chat/turn/message-helpers";

const ORCHESTRATE_TIMEOUT_MS = 18_000;

export type ExecuteOrchestrateTurnInput = {
  scopeId: string;
  trimmed: string;
  orchestrateMessage: string;
  composerContext?: string;
  messageChatAxis: ChatAxis;
  base: ActionChatMessage[];
  loadingId: string;
  userMessage: ActionChatMessage;
  activeLink: Pick<LinkRow, "title" | "original_url" | "category"> | null;
  chainedLinks: LinkRow[];
  studyQaTurn: boolean;
  turnStartedAt: number;
};

export type ExecuteOrchestrateTurnDeps = {
  persist: (messages: ActionChatMessage[]) => void;
  createMessage: (
    role: ActionChatMessage["role"],
    text: string,
    extra?: Partial<ActionChatMessage>,
  ) => ActionChatMessage;
  applyReviewGateFromOrchestrator: (payload: OrchestratorResult) => void;
  syncThreadlineFromOrchestrator: (payload: OrchestratorResult) => void;
  setDatePickerRequest: (trigger: ActionUiTriggerWire | null) => void;
  activateScheduledDelivery: (input: {
    messageId: string;
    extracted: NonNullable<OrchestratorResult["scheduleExtract"]>;
    sourceMessage: string;
  }) => Promise<void>;
  buildStudyAuxDeps: () => Parameters<typeof executeStudyAuxClient>[1];
};

/** Execution layer — POST `/api/chat/orchestrate` and apply wire payload to chat store. */
export async function executeOrchestrateTurn(
  input: ExecuteOrchestrateTurnInput,
  deps: ExecuteOrchestrateTurnDeps,
): Promise<void> {
  const {
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
  } = input;

  const history = base
    .filter((message) => !message.loading)
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: historyContentFromMessage(message),
    }))
    .filter((turn) => turn.content.length > 0);

  const recentActivities = await listSearchActivities(10);
  let locationMemory = null as ReturnType<typeof buildLocationMemoryWire> | null;
  let placePreferences: Awaited<ReturnType<typeof buildPlacePreferencesWire>> = [];
  let priorPlaceChoice = null as ReturnType<typeof resolvePriorPlaceChoice> | null;

  try {
    locationMemory = buildLocationMemoryWire({ recentActivities });
    const correctionLogs = await listCorrectionLogs(30, { mergeRemote: true });
    placePreferences = await buildPlacePreferencesWire(12);
    priorPlaceChoice = resolvePriorPlaceChoice({
      message: trimmed,
      logs: correctionLogs,
    });
  } catch (prepError) {
    console.error("[action-chat] context prep failed", prepError);
  }

  let linkedLinks: ReturnType<typeof buildLinkedLinksWire> = [];
  try {
    linkedLinks = buildLinkedLinksWire(chainedLinks);
  } catch (linkWireError) {
    console.error("[action-chat] linkedLinks wire failed", linkWireError);
  }

  if (shouldLogSearchActivity(orchestrateMessage)) {
    void appendSearchActivity({
      query: orchestrateMessage,
      kind: inferSearchActivityKind(orchestrateMessage),
    }).catch(() => undefined);
  }

  const response = await fetchWithTimeout("/api/chat/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: orchestrateMessage,
      composerContext: composerContext ?? null,
      history,
      linkTitle: activeLink?.title ?? null,
      linkUrl: activeLink?.original_url ?? null,
      linkCategory: activeLink?.category ?? null,
      linkedLinks,
      masterContext: {
        ...serializeMasterContextForApi(undefined, { chatScopeId: scopeId }),
        containerGateEnabled: false,
        ...(activeLink
          ? {}
          : {
              activeChains: [],
              activeChain: null,
              activeChainsWire: [],
            }),
        locationMemory,
        priorPlaceChoice,
        placePreferences,
      },
      chatAxis: messageChatAxis ?? null,
      vitalityMemory: readVitalityMemory(),
    }),
    timeoutMs: ORCHESTRATE_TIMEOUT_MS,
    timeoutLabel: "chat_orchestrate",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[action-chat] orchestrate HTTP", response.status, errorBody);
    throw new Error("orchestrate_failed");
  }

  const payload = (await response.json()) as OrchestratorResult;

  if (payload.globalBrain?.userStatusPatch !== undefined) {
    applyUserStatusPatchFromApi(payload.globalBrain.userStatusPatch);
  }
  if (payload.globalBrain?.preferencePatch) {
    applyPreferencePatchFromApi(payload.globalBrain.preferencePatch);
  }
  if (payload.globalBrain?.nexusContactTouch?.name) {
    touchNexusContact(payload.globalBrain.nexusContactTouch.name);
  }
  if (payload.eventCandidateUpserts?.length) {
    applyOcrCalendarCommitToClient({
      eventCandidateUpserts: payload.eventCandidateUpserts,
      calendarEvents: payload.metadata?.calendar_events as
        | import("@/lib/event-kernel/review/execute-approve-pending-events").CalendarEvent[]
        | undefined,
    });
  } else if (payload.eventCandidateUpsert) {
    applyEventCandidateUpsertFromApi(payload.eventCandidateUpsert, {
      sourceMessageId: userMessage.id,
    });
  }

  const batchItems =
    payload.batchResults?.filter((item) => (item.actions?.length ?? 0) > 0) ?? [];
  if (batchItems.length >= 2) {
    const assistantMessages = batchItems.map((item) =>
      deps.createMessage("assistant", item.summary, {
        actions: item.actions ?? [],
        confidence: payload.confidence ?? 0.9,
        disclosure: payload.disclosure ?? "high",
        actionsRevealed: true,
        pendingConfirm: false,
        metadata: payload.metadata ?? {
          intent: "ACTION",
          trust_level_adjustment: "NONE",
        },
      }),
    );

    deps.persist([...base.filter((message) => message.id !== loadingId), ...assistantMessages]);
    return;
  }

  if (payload.cafeDiscovery?.summary) {
    void appendSearchActivity({
      query: trimmed,
      kind: "discovery",
    });
  }

  if (payload.confirmation?.location_suggestions?.length) {
    void appendSearchActivity({
      query: payload.confirmation.confirm_data?.subject ?? trimmed,
      kind: "place_confirm",
    });
  }

  const displaySummary = resolveAssistantDisplaySummary(payload);
  const tikiChoices = parseTikiChoiceOptions(displaySummary);

  const vitalityStates = (payload.metadata as { vitality_states?: VitalityStateKind[] } | undefined)
    ?.vitality_states;
  if (vitalityStates?.length) {
    writeVitalityMemory(vitalityStates);
  }

  publishGoalSnapshotFromTurn(scopeId, payload.goalSnapshot);

  const assistantMessage = deps.createMessage("assistant", displaySummary, {
    actions: payload.actions ?? [],
    confidence: payload.confidence,
    disclosure: payload.disclosure,
    actionsRevealed: payload.actionsRevealed ?? false,
    pendingConfirm: payload.pendingConfirm ?? false,
    metadata: payload.metadata,
    meta: payload.meta,
    chatAxis: messageChatAxis,
    tikiChoices: tikiChoices.length >= 2 ? tikiChoices : undefined,
    schedule: payload.schedule,
    container: payload.container,
    transportLive: payload.transportLive,
    uiTrigger: payload.uiTrigger,
    knowledgeSaved: payload.knowledgeSaved,
    confirmation: payload.confirmation,
    scheduledDelivery: payload.scheduledDelivery,
    scheduleExtract: payload.scheduleExtract,
    cafeDiscovery: payload.cafeDiscovery,
    guardrail: payload.guardrail,
    policy: payload.policy,
    experienceChoice: payload.experienceChoice,
    entityQuickPick: payload.entityQuickPick,
    scheduleAdvisory: payload.scheduleAdvisory,
    morningBriefing: payload.morningBriefing,
    dataArchitect: payload.dataArchitect,
    presentation: payload.presentation,
    flightStatusCard: payload.flightStatusCard,
    packingChecklist: payload.packingChecklist,
    actionOsDock: payload.actionOsDock,
  });

  if (
    payload.uiTrigger?.type === "DATE_PICKER" ||
    payload.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER"
  ) {
    deps.setDatePickerRequest(payload.uiTrigger);
  }
  deps.applyReviewGateFromOrchestrator(payload);
  if (payload.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER") {
    deps.syncThreadlineFromOrchestrator(payload);
  }

  if (payload.knowledgeSaved?.length) {
    toast("Knowledge Container에 저장했어요", {
      description: payload.knowledgeSaved[0]?.value,
    });
  }

  deps.persist([...base.filter((message) => message.id !== loadingId), assistantMessage]);

  const autoAux = readAutoExecuteStudyAux(payload.metadata as Record<string, unknown> | undefined);
  if (autoAux) {
    void executeStudyAuxClient(autoAux as StudyAuxKind, deps.buildStudyAuxDeps());
  } else if (studyQaTurn) {
    appendStudyQaFollowUpIfNeeded(deps.buildStudyAuxDeps());
  }

  submitLiveTurn({
    stage: "output",
    userMessage: trimmed,
    messageId: assistantMessage.id,
    assistantSummary: displaySummary,
    chatAxis: messageChatAxis,
    metadata: (payload.metadata ?? undefined) as Record<string, unknown> | undefined,
    vitality: vitalityStates,
    latencyMs: Date.now() - turnStartedAt,
    history: history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
  });

  if (
    payload.scheduledDelivery?.status === "pending" &&
    payload.scheduleExtract?.datetime
  ) {
    void deps.activateScheduledDelivery({
      messageId: assistantMessage.id,
      extracted: payload.scheduleExtract,
      sourceMessage: trimmed,
    });
  } else if (
    (payload as { timeChoiceExecution?: { mode?: string } }).timeChoiceExecution?.mode ===
      "calendar" &&
    payload.scheduleExtract?.datetime
  ) {
    void saveScheduledTravelToCalendar({
      extracted: payload.scheduleExtract,
      sourceMessage: trimmed,
    }).then(() => {
      toast("일정을 저장했어요");
    });
  }
}
