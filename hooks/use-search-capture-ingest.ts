"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import {
  ingestSearchMediaCapture,
  ingestSearchMemoCapture,
  reassignCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import { buildPlanEventDraft } from "@/lib/feed/bootstrap-spacetime-target";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import type { SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import { classifySearchComposerIntent } from "@/lib/search/classify-search-composer-intent";
import { useCopy } from "@/hooks/use-copy";

export type SpacetimeTargetSheetState = {
  result: SearchCaptureIngestResult;
  candidates: SpacetimeFeedTargetMatch[];
} | null;

export function useSearchCaptureIngest() {
  const copy = useCopy();
  const [targetSheet, setTargetSheet] = useState<SpacetimeTargetSheetState>(null);
  const [ingesting, setIngesting] = useState(false);

  const openTargetingIfNeeded = useCallback((result: SearchCaptureIngestResult) => {
    if (!result.needsTargetingConfirm) {
      return;
    }

    const events = listLifeEventCandidates().filter(
      (event) => event.lifecycle !== "archived" && event.id !== result.event.id,
    );
    const candidates = events
      .map((event) =>
        resolveSpacetimeFeedTarget({
          capturedAtIso: result.fragment.capturedAtIso,
          lat: null,
          lng: null,
          placeLabel: result.fragment.placeLabel ?? null,
          events: [event],
        }),
      )
      .filter((row): row is SpacetimeFeedTargetMatch => row !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    setTargetSheet({ result, candidates });
  }, []);

  const finishIngest = useCallback(
    (result: SearchCaptureIngestResult) => {
      toast.success(result.toastLine, {
        description: "Feed에서 오늘 흐름을 확인해 보세요",
      });
      openTargetingIfNeeded(result);
    },
    [openTargetingIfNeeded],
  );

  const ingestFile = useCallback(
    async (file: File) => {
      if (ingesting) {
        return false;
      }
      setIngesting(true);
      try {
        const outcome = await ingestSearchMediaCapture(file);
        if (outcome.status === "skipped") {
          toast.message(outcome.decision.reason, { duration: 3200 });
          return false;
        }
        finishIngest(outcome.result);
        return true;
      } catch {
        toast.error("사진을 Feed에 붙이지 못했어요");
        return false;
      } finally {
        setIngesting(false);
      }
    },
    [finishIngest, ingesting],
  );

  const ingestMemo = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || ingesting) {
        return false;
      }

      const intent = classifySearchComposerIntent(trimmed);
      if (intent === "generic_ai") {
        toast.message(copy.search.blockedGenericQuery, {
          description: copy.search.blockedGenericQuerySub,
          duration: 4200,
        });
        return true;
      }

      setIngesting(true);
      try {
        const result = ingestSearchMemoCapture(trimmed);
        finishIngest(result);
        return true;
      } catch {
        toast.error("메모를 Feed에 붙이지 못했어요");
        return false;
      } finally {
        setIngesting(false);
      }
    },
    [
      copy.search.blockedGenericQuery,
      copy.search.blockedGenericQuerySub,
      finishIngest,
      ingesting,
    ],
  );

  const confirmTargetMatch = useCallback(
    (match: SpacetimeFeedTargetMatch) => {
      if (!targetSheet) {
        return;
      }
      const event = listLifeEventCandidates().find((row) => row.id === match.eventId);
      if (!event) {
        setTargetSheet(null);
        return;
      }
      reassignCaptureToEvent({
        fragment: targetSheet.result.fragment,
        event,
        match,
        fromEventId: targetSheet.result.event.id,
      });
      toast.success(`${match.eventTitle}에 맞췄어요`);
      setTargetSheet(null);
    },
    [targetSheet],
  );

  const createPlanTarget = useCallback(
    (input: { place: string; nights: number; title?: string }) => {
      if (!targetSheet) {
        return;
      }
      const capturedAtIso = targetSheet.result.fragment.capturedAtIso;
      const draft = buildPlanEventDraft({
        title: input.title?.trim() || `${input.place.trim()} 여행`,
        place: input.place.trim(),
        startIso: capturedAtIso,
        nights: input.nights,
      });
      const saved = commitEventUpsert(draft);
      const match = resolveSpacetimeFeedTarget({
        capturedAtIso,
        lat: null,
        lng: null,
        placeLabel: input.place.trim(),
        events: [saved],
      });
      reassignCaptureToEvent({
        fragment: targetSheet.result.fragment,
        event: saved,
        match,
        fromEventId: targetSheet.result.event.id,
      });
      toast.success(`${saved.title} 일정을 만들고 붙였어요`);
      setTargetSheet(null);
    },
    [targetSheet],
  );

  const dismissTargetSheet = useCallback(() => {
    setTargetSheet(null);
  }, []);

  return {
    ingesting,
    targetSheet,
    ingestFile,
    ingestMemo,
    confirmTargetMatch,
    createPlanTarget,
    dismissTargetSheet,
  };
}
