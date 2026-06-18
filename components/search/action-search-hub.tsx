"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ActionChatFeed } from "@/components/action-chat-feed";
import { SpacetimeTargetSheet } from "@/components/search/spacetime-target-sheet";
import { useRelatedContextSearch } from "@/hooks/use-related-context-search";
import { useSearchCaptureIngest } from "@/hooks/use-search-capture-ingest";
import { useCopy } from "@/hooks/use-copy";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readFeedExperienceRunContext } from "@/lib/feed/feed-experience-run-context-store";
import {
  parseExperienceRunSearchParams,
  type SearchExperienceExecution,
} from "@/lib/feed/feed-experience-run-mentions";

function resolveSearchExecution(
  params: URLSearchParams,
): SearchExperienceExecution | null {
  const parsed = parseExperienceRunSearchParams(params);
  if (!parsed) {
    return null;
  }
  const stored = readFeedExperienceRunContext();
  return {
    eventId: parsed.eventId,
    featureId: parsed.featureId,
    place: parsed.place ?? stored?.place ?? null,
    headline:
      stored?.eventId === parsed.eventId ? stored.headline : stored?.headline ?? null,
  };
}

/** 검색 탭 — 수집 ingress · Feed 경험 @ 실행은 run=mention 모드. */
export function ActionSearchHub() {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const searchExecution = useMemo(
    () => resolveSearchExecution(searchParams),
    [searchParams],
  );
  const {
    ingesting,
    targetSheet,
    ingestFile,
    ingestMemo,
    confirmTargetMatch,
    createPlanTarget,
    dismissTargetSheet,
  } = useSearchCaptureIngest();
  const relatedContext = useRelatedContextSearch();
  const searchContext = useRef(relatedContext.search);
  searchContext.current = relatedContext.search;

  const contextEventId = searchParams.get("contextEventId")?.trim() ?? "";
  const contextQuery = searchParams.get("q")?.trim() ?? "";
  const searchContextPrefill = useMemo(() => {
    if (!contextEventId) {
      return null;
    }
    const event = findLifeEventCandidate(contextEventId);
    return (
      contextQuery ||
      event?.place?.trim() ||
      event?.title?.trim() ||
      null
    );
  }, [contextEventId, contextQuery]);

  useEffect(() => {
    if (!contextEventId) {
      return;
    }
    const event = findLifeEventCandidate(contextEventId);
    const query =
      contextQuery ||
      event?.place?.trim() ||
      event?.title?.trim() ||
      "";
    if (query) {
      searchContext.current(query);
    }
  }, [contextEventId, contextQuery]);

  return (
    <>
      <ActionChatFeed
        variant="conversation"
        scopeKind="search"
        links={[]}
        activeIndex={-1}
        onSelectIndex={() => {}}
        onOpenLinkPaste={() => {}}
        onQuickCapture={(file) => {
          void ingestFile(file);
        }}
        onSearchMemoIngest={async (text) => ingestMemo(text)}
        searchIngesting={ingesting}
        className="min-h-0 flex-1"
        searchIngressHint={copy.search.ingressHint}
        searchExecution={searchExecution}
        searchContextPrefill={searchContextPrefill}
        hubContextSearch={Boolean(contextEventId)}
        relatedContextSearch={{
          active: relatedContext.active,
          result: relatedContext.result,
          onSearch: relatedContext.search,
          onClear: relatedContext.clear,
        }}
      />

      <SpacetimeTargetSheet
        state={targetSheet}
        onConfirmMatch={confirmTargetMatch}
        onCreatePlan={createPlanTarget}
        onDismiss={dismissTargetSheet}
      />
    </>
  );
}
