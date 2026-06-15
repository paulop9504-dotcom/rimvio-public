export type AnalyticsSurface = "now" | "feed" | "inbox" | "stack" | "room";

export type FunnelStep =
  | "share"
  | "now_open"
  | "now_ready"
  | "now_action"
  | "now_done"
  | "now_error";

type AnalyticsEventBase = {
  ts: number;
  sessionId: string;
  flowId: string | null;
};

export type EnrichAnalyticsEvent = AnalyticsEventBase & {
  type: "enrich";
  domain: string;
  enricher_id: string;
  source_type: string;
  titleFromDomain: boolean;
  imageFromFallback: boolean;
};

export type ActionClickAnalyticsEvent = AnalyticsEventBase & {
  type: "action_click";
  surface: AnalyticsSurface;
  domain: string;
  enricher_id: string | null;
  source_type: string | null;
  actionLabel: string;
  actionKind: string;
  hadCopyText: boolean;
  copySucceeded: boolean;
};

export type FunnelAnalyticsEvent = AnalyticsEventBase & {
  type: "funnel";
  step: FunnelStep;
  domain: string | null;
  enricher_id: string | null;
};

export type BlinkAnalyticsEventInput =
  | Omit<EnrichAnalyticsEvent, keyof AnalyticsEventBase>
  | Omit<ActionClickAnalyticsEvent, keyof AnalyticsEventBase>
  | Omit<FunnelAnalyticsEvent, keyof AnalyticsEventBase>;

export type BlinkAnalyticsEvent =
  | EnrichAnalyticsEvent
  | ActionClickAnalyticsEvent
  | FunnelAnalyticsEvent;

export type AnalyticsSummary = {
  eventCount: number;
  sessionCount: number;
  oldestTs: number | null;
  newestTs: number | null;
  enrichByDomain: Record<string, number>;
  enrichByEnricher: Record<string, number>;
  enrichBySourceType: Record<string, number>;
  fallback: {
    total: number;
    titleFromDomain: number;
    imageFromFallback: number;
    anyFallback: number;
  };
  actionClicksByLabel: Record<string, number>;
  actionClicksByDomain: Record<string, number>;
  copy: {
    clicksWithCopyText: number;
    copySucceeded: number;
    copyFailed: number;
    copySuccessRate: number | null;
  };
  funnel: Record<FunnelStep, number>;
  funnelRates: {
    shareToReady: number | null;
    readyToAction: number | null;
    actionToDone: number | null;
    shareToDone: number | null;
  };
};
