import type {
  AnalyticsSummary,
  BlinkAnalyticsEvent,
  FunnelStep,
} from "@/lib/analytics/types";

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 1000;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function summarizeAnalyticsEvents(
  events: BlinkAnalyticsEvent[]
): AnalyticsSummary {
  const enrichByDomain: Record<string, number> = {};
  const enrichByEnricher: Record<string, number> = {};
  const enrichBySourceType: Record<string, number> = {};
  const actionClicksByLabel: Record<string, number> = {};
  const actionClicksByDomain: Record<string, number> = {};

  const funnel: Record<FunnelStep, number> = {
    share: 0,
    now_open: 0,
    now_ready: 0,
    now_action: 0,
    now_done: 0,
    now_error: 0,
  };

  let titleFromDomain = 0;
  let imageFromFallback = 0;
  let anyFallback = 0;
  let enrichTotal = 0;

  let clicksWithCopyText = 0;
  let copySucceeded = 0;
  let copyFailed = 0;

  const sessions = new Set<string>();
  let oldestTs: number | null = null;
  let newestTs: number | null = null;

  for (const event of events) {
    sessions.add(event.sessionId);

    if (oldestTs === null || event.ts < oldestTs) {
      oldestTs = event.ts;
    }
    if (newestTs === null || event.ts > newestTs) {
      newestTs = event.ts;
    }

    if (event.type === "enrich") {
      enrichTotal += 1;
      bump(enrichByDomain, event.domain);
      bump(enrichByEnricher, event.enricher_id);
      bump(enrichBySourceType, event.source_type);

      if (event.titleFromDomain) {
        titleFromDomain += 1;
      }
      if (event.imageFromFallback) {
        imageFromFallback += 1;
      }
      if (event.titleFromDomain || event.imageFromFallback) {
        anyFallback += 1;
      }
    }

    if (event.type === "action_click") {
      bump(actionClicksByLabel, event.actionLabel);
      bump(actionClicksByDomain, event.domain);

      if (event.hadCopyText) {
        clicksWithCopyText += 1;
        if (event.copySucceeded) {
          copySucceeded += 1;
        } else {
          copyFailed += 1;
        }
      }
    }

    if (event.type === "funnel") {
      funnel[event.step] += 1;
    }
  }

  return {
    eventCount: events.length,
    sessionCount: sessions.size,
    oldestTs,
    newestTs,
    enrichByDomain,
    enrichByEnricher,
    enrichBySourceType,
    fallback: {
      total: enrichTotal,
      titleFromDomain,
      imageFromFallback,
      anyFallback,
    },
    actionClicksByLabel,
    actionClicksByDomain,
    copy: {
      clicksWithCopyText,
      copySucceeded,
      copyFailed,
      copySuccessRate: rate(copySucceeded, clicksWithCopyText),
    },
    funnel,
    funnelRates: {
      shareToReady: rate(funnel.now_ready, funnel.share),
      readyToAction: rate(funnel.now_action, funnel.now_ready),
      actionToDone: rate(funnel.now_done, funnel.now_action),
      shareToDone: rate(funnel.now_done, funnel.share),
    },
  };
}
