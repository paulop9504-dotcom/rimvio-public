import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { parseScheduleTasksFromMessage } from "@/lib/schedule/day-schedule";
import { extractPhoneFromText } from "@/lib/enrichers/extract-phone";
import {
  FIXED_DATA_CONTAINER_ID,
  type KnowledgeEntity,
} from "@/lib/knowledge/knowledge-entity-types";
import {
  resetKnowledgeEntityMemoryForTests,
  saveKnowledgeEntity,
  searchKnowledgeEntities,
} from "@/lib/knowledge/knowledge-entity-db";
import {
  recallPlacePreferencesFromWire,
  type PlacePreferenceWire,
} from "@/lib/corrections/place-preference-knowledge";
import { isEntityFacetMessage } from "@/lib/context-resolver/discovery/parse-entity-facet-intent";

const VERB_INTENT =
  /(?:갈게|할게|가겠|하겠|만날게|만나|약속|미팅|회의|볼게|놀러|참석|출발)/i;

const HAS_TIME =
  /\d{1,2}(?::\d{2})?\s*(?:시|am|pm)?|오전|오후|아침|점심|저녁|내일|모레|모레|주말|\d{1,2}월\s*\d{1,2}일/i;

const RECALL_HINT = /(?:아까|방금|저장(?:한|했)|그\s*(?:번호|연락처|전화)|뭐였|뭐더라|찾아)/i;

const SHORT_TEXT_MAX = 80;

function trimSummary(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}

function extractDraftTask(message: string) {
  return message
    .replace(/(?:갈게|할게|가겠|하겠|만날게|볼게)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function detectVerbWithoutTime(message: string) {
  if (!VERB_INTENT.test(message)) {
    return null;
  }

  if (HAS_TIME.test(message)) {
    return null;
  }

  if (parseScheduleTasksFromMessage(message).length > 0) {
    return null;
  }

  if (parseRelativeDateTimeFromText(message, new Date().toISOString().slice(0, 10))) {
    return null;
  }

  return extractDraftTask(message) || "일정";
}

export async function autoSaveKnowledgeFromMessage(
  message: string
): Promise<KnowledgeEntity[]> {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > SHORT_TEXT_MAX) {
    return [];
  }

  const phone = extractPhoneFromText(trimmed);
  const saved: KnowledgeEntity[] = [];

  if (phone) {
    saved.push(
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "phone",
        label: "연락처",
        value: phone.replace(/\D/g, ""),
        sourceMessage: trimmed,
      })
    );
  }

  const looksImportant =
    phone ||
    /(?:번호|연락처|tel|phone|메모|기억해|저장)/i.test(trimmed);

  if (looksImportant && !phone && trimmed.length >= 4 && trimmed.length <= SHORT_TEXT_MAX) {
    saved.push(
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "note",
        label: "메모",
        value: trimmed,
        sourceMessage: trimmed,
      })
    );
  }

  return saved;
}

export async function tryKnowledgeRecall(
  message: string,
  options?: { placePreferences?: PlacePreferenceWire[] }
): Promise<OrchestratorResult | null> {
  if (isEntityFacetMessage(message)) {
    return null;
  }

  const placePrefs = recallPlacePreferencesFromWire({
    message,
    preferences: options?.placePreferences ?? [],
  });

  const recallHint = RECALL_HINT.test(message) || placePrefs.length > 0;
  if (!recallHint) {
    return null;
  }

  if (placePrefs.length > 0 && !/(?:번호|연락처|전화)/u.test(message)) {
    const top = placePrefs[0]!;
    return {
      summary: trimSummary(`단골 장소 · ${top.label}: ${top.value}`),
      actions: [],
      source: "conversation",
      confidence: 1,
      disclosure: "none",
      knowledgeSaved: placePrefs.map((pref) => ({
        id: pref.id,
        label: pref.label,
        value: pref.value,
        type: "place",
        containerId: FIXED_DATA_CONTAINER_ID,
      })),
    };
  }

  const query = message
    .replace(/(?:아까|방금|저장(?:한|했)|그|뭐였|뭐더라|찾아|줘|알려|뭐야)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hits = await searchKnowledgeEntities({
    query:
      /(?:번호|연락처|전화)/.test(message) || query.length < 2
        ? "연락처"
        : query,
    containerId: FIXED_DATA_CONTAINER_ID,
    limit: 3,
  });

  if (hits.length === 0) {
    return {
      summary: "저장된 항목을 찾지 못했어요",
      actions: [],
      source: "conversation",
      confidence: 1,
      disclosure: "none",
    };
  }

  const top = hits[0]!;
  return {
    summary: trimSummary(`${top.label}: ${top.value}`),
    actions: [],
    source: "conversation",
    confidence: 1,
    disclosure: "none",
    knowledgeSaved: hits.map((entity) => ({
      id: entity.id,
      label: entity.label,
      value: entity.value,
      type: entity.type,
      containerId: entity.containerId,
    })),
  };
}

export function buildDatePickerOrchestratorResult(input: {
  draftTask: string;
}): OrchestratorResult {
  const uiTrigger: ActionUiTriggerWire = {
    type: "DATE_PICKER",
    draft_task: input.draftTask,
  };

  return {
    summary: "언제로 잡을까요?",
    actions: [],
    source: "rules",
    confidence: 0.92,
    disclosure: "high",
    actionsRevealed: true,
    uiTrigger,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
    },
  };
}

export function mapKnowledgeEntitiesToWire(entities: KnowledgeEntity[]) {
  return entities.map((entity) => ({
    id: entity.id,
    label: entity.label,
    value: entity.value,
    type: entity.type,
    containerId: entity.containerId,
  }));
}

export { resetKnowledgeEntityMemoryForTests };
