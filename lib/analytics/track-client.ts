"use client";

import { readActionCopyText, runLinkAction } from "@/lib/actions/execute-link-action";
import { appendAnalyticsEvent } from "@/lib/analytics/store";
import type { EnrichedLink } from "@/lib/enrichers/types";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { AnalyticsSurface, FunnelStep } from "@/lib/analytics/types";
export {
  endAnalyticsFlow,
  readAnalyticsFlowId,
  startAnalyticsFlow,
} from "@/lib/analytics/flow";

export function trackEnrich(enriched: EnrichedLink) {
  appendAnalyticsEvent({
    type: "enrich",
    domain: enriched.domain,
    enricher_id: enriched.enricher_id,
    source_type: enriched.source_type,
    titleFromDomain: enriched.fallback.titleFromDomain,
    imageFromFallback: enriched.fallback.imageFromFallback,
  });
}

export function trackFunnel(
  step: FunnelStep,
  meta?: { domain?: string | null; enricher_id?: string | null }
) {
  appendAnalyticsEvent({
    type: "funnel",
    step,
    domain: meta?.domain ?? null,
    enricher_id: meta?.enricher_id ?? null,
  });
}

export function trackActionClick(input: {
  surface: AnalyticsSurface;
  domain: string;
  enricher_id?: string | null;
  source_type?: string | null;
  action: LinkActionItem;
  copySucceeded: boolean;
}) {
  appendAnalyticsEvent({
    type: "action_click",
    surface: input.surface,
    domain: input.domain,
    enricher_id: input.enricher_id ?? null,
    source_type: input.source_type ?? null,
    actionLabel: input.action.label,
    actionKind: input.action.kind,
    hadCopyText: Boolean(readActionCopyText(input.action)),
    copySucceeded: input.copySucceeded,
  });
}

export function analyticsFromLink(
  link: LinkRow,
  surface: AnalyticsSurface
): {
  surface: AnalyticsSurface;
  domain: string;
  enricher_id: null;
  source_type: string | null;
} {
  return {
    surface,
    domain: link.domain,
    enricher_id: null,
    source_type: link.category,
  };
}

export function analyticsFromEnriched(
  enriched: EnrichedLink,
  surface: AnalyticsSurface
) {
  return {
    surface,
    domain: enriched.domain,
    enricher_id: enriched.enricher_id,
    source_type: enriched.source_type,
  };
}

export async function runAndTrackLinkAction(
  action: LinkActionItem,
  meta: {
    surface: AnalyticsSurface;
    domain: string;
    enricher_id?: string | null;
    source_type?: string | null;
  }
) {
  const { copiedText } = await runLinkAction(action);
  trackActionClick({
    ...meta,
    action,
    copySucceeded: Boolean(copiedText),
  });
  return { copiedText };
}
