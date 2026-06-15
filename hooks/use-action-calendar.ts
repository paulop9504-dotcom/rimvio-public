"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import {
  collectActionStream,
  type ActiveActionEntry,
} from "@/lib/action-chat/active-actions-registry";
import type { ActionCalendarSnapshot } from "@/lib/calendar/build-action-calendar";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import {
  buildPrepSurface,
  fetchPrepLlmCandidatesByRowId,
  isPrepLlmCandidatesEnabled,
  prepLlmQualifyingKey,
  type SchedulePrepSurface,
} from "@/lib/calendar/prep-surface-llm";
import type { LlmActionCandidateWire } from "@/lib/llm-action-candidate-generator";
import { useSurfaceEngine } from "@/hooks/use-surface-engine";
import { buildCalendarSnapshotFromSurfaces } from "@/lib/surface-engine/adapters/surface-to-calendar";
import {
  getRecentKnowledgeEntities,
  KNOWLEDGE_ENTITY_UPDATED,
} from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

export type UseActionCalendarInput = {
  messages: ActionChatMessage[];
  linkIds: string[];
  /** Bumps recompute when link reminders or other external stream inputs change. */
  refreshKey?: unknown;
  /** Prep-surface LLM action candidates (default: env flag). */
  enableLlmCandidates?: boolean;
};

export type ActionCalendarView = ActionCalendarSnapshot & {
  /** Chat/link timed actions (detail panel buttons). */
  actionStream: ActiveActionEntry[];
  /** First stream entry — next timed action in chat feed strip. */
  nextAction: ActiveActionEntry | null;
  now: Date;
  anchor: Date;
  setAnchor: (value: Date) => void;
  /** Badge on 📅 — visible row count. */
  badgeCount: number;
  overlayRows: UnifiedCalendarOverlayRow[];
  /** Prep-time compact calendar slice (rules + optional LLM candidates). */
  prepSurface: SchedulePrepSurface;
};

/** Sheet/detail panel — subset of {@link ActionCalendarView}. */
export type ActionCalendarSheetView = Pick<
  ActionCalendarView,
  "overlayRows" | "actionStream" | "rowCount" | "attachedActionCount"
>;

function deriveAnchorFromMessages(messages: readonly ActionChatMessage[]): Date | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }
    const calendarEvents = (
      message.metadata as
        | { calendar_events?: Array<{ start?: string }> }
        | undefined
    )?.calendar_events;
    const firstStart = calendarEvents?.[0]?.start;
    if (!firstStart) {
      continue;
    }
    const parsed = parseActionTargetDatetime(firstStart);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

/**
 * Action Calendar — single UI entry for all calendar read paths.
 * @see buildActionCalendar for pure rebuild (tests, engine).
 */
export function useActionCalendar(input: UseActionCalendarInput): ActionCalendarView {
  const [anchor, setAnchor] = useState(() => new Date());
  const [knowledgeTick, setKnowledgeTick] = useState(0);
  const [knowledgeEntities, setKnowledgeEntities] = useState<
    Awaited<ReturnType<typeof getRecentKnowledgeEntities>>
  >([]);

  const actionStream = useMemo(
    () => collectActionStream(input.messages, { linkIds: input.linkIds }),
    [input.messages, input.linkIds, input.refreshKey],
  );

  useEffect(() => {
    const derived = deriveAnchorFromMessages(input.messages);
    if (derived) {
      setAnchor(derived);
    }
  }, [input.messages]);

  useEffect(() => {
    let cancelled = false;
    void getRecentKnowledgeEntities({
      containerId: FIXED_CALENDAR_CONTAINER_ID,
      limit: 40,
    }).then((rows) => {
      if (!cancelled) {
        setKnowledgeEntities(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [knowledgeTick]);

  useEffect(() => {
    const onUpdate = () => setKnowledgeTick((value) => value + 1);
    window.addEventListener(KNOWLEDGE_ENTITY_UPDATED, onUpdate);
    return () => window.removeEventListener(KNOWLEDGE_ENTITY_UPDATED, onUpdate);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setKnowledgeTick((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { calendar } = useSurfaceEngine({ context: { now: anchor } });
  const now = anchor;

  const snapshot = useMemo(
    () =>
      buildCalendarSnapshotFromSurfaces({
        calendarSurfaces: calendar,
        streamActions: actionStream,
        knowledgeEntities,
        anchor,
        now,
      }),
    [calendar, actionStream, knowledgeEntities, anchor, now],
  );

  const overlayRows = snapshot.overlayRows;
  const llmEnabled =
    input.enableLlmCandidates !== false && isPrepLlmCandidatesEnabled();

  const [llmCandidatesByRowId, setLlmCandidatesByRowId] = useState<
    Record<string, LlmActionCandidateWire[]>
  >({});

  const qualifyingKey = useMemo(
    () => prepLlmQualifyingKey(overlayRows, now, llmEnabled),
    [overlayRows, now, llmEnabled],
  );

  useEffect(() => {
    if (!qualifyingKey) {
      setLlmCandidatesByRowId({});
      return;
    }

    let cancelled = false;

    void fetchPrepLlmCandidatesByRowId({ overlayRows, now }).then((next) => {
      if (!cancelled) {
        setLlmCandidatesByRowId(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [qualifyingKey, overlayRows, now]);

  const prepSurface = useMemo(
    () => buildPrepSurface(overlayRows, now, { llmCandidatesByRowId }),
    [overlayRows, now, llmCandidatesByRowId],
  );

  const nextAction = actionStream[0] ?? null;

  return {
    ...snapshot,
    actionStream,
    nextAction,
    now,
    anchor,
    setAnchor,
    badgeCount: snapshot.rowCount,
    overlayRows,
    prepSurface,
  };
}
