/**
 * Predictive Curation telemetry — intent ↔ recommendation gap learning.
 * @see docs/GLOBE_HUB_RESOURCE.md · lib/telemetry/telemetry-logger.ts
 *
 * All payloads are de-identified and include capture-time spacetime context.
 */

/** Hub carousel · resource rank learning events (non-blocking pipeline). */
export type PredictiveCurationEventType =
  | "RESOURCE_IMPRESSION"
  | "RESOURCE_DISMISSED"
  | "RESOURCE_MANUAL_PICK"
  | "TRANSACTION_CONVERTED";

/** Where the MAIN impression was captured — carousel web vs native OS surface. */
export type CurationImpressionSurface = "carousel_main" | "native_main";

/** Spacetime context frozen at event capture — ranking engine input mirror. */
export type SpacetimeTelemetryContext = {
  /** EventCandidate / context window start (ISO). */
  event_start_iso?: string | null;
  /** Plan window end or validity bound (ISO). */
  event_end_iso?: string | null;
  event_place_label?: string | null;
  event_lat?: number | null;
  event_lng?: number | null;
  /** Ranker output at impression time. */
  rank_score?: number | null;
  /** Carousel slot — 0 = MAIN JIT resource. */
  carousel_index?: number | null;
  resource_kind?: string | null;
  source_hub_id?: string | null;
};

/** Required fields on every curation telemetry event. */
export type PredictiveCurationTelemetryBase = {
  event_type: PredictiveCurationEventType;
  /** One-way hashed identifier — never raw auth id on the wire. */
  user_id: string;
  context_id: string;
  resource_id: string;
  current_lat: number | null;
  current_lng: number | null;
  /** ISO-8601 capture instant. */
  timestamp: string;
  /** Milliseconds visible in MAIN before dismiss / leave slot; null if N/A. */
  dwell_time: number | null;
};

export type ResourceImpressionTelemetry = PredictiveCurationTelemetryBase &
  SpacetimeTelemetryContext & {
    event_type: "RESOURCE_IMPRESSION";
    carousel_index: 0;
    /** Web carousel vs native Live Activity / ongoing notification. */
    surface: CurationImpressionSurface;
  };

export type ResourceDismissedTelemetry = PredictiveCurationTelemetryBase &
  SpacetimeTelemetryContext & {
    event_type: "RESOURCE_DISMISSED";
    /** Index user dismissed from — always 0 for MAIN swipe-away. */
    carousel_index: 0;
    dismiss_reason: "swipe_next" | "swipe_away" | "carousel_dot";
  };

export type ResourceManualPickTelemetry = PredictiveCurationTelemetryBase &
  SpacetimeTelemetryContext & {
    event_type: "RESOURCE_MANUAL_PICK";
    carousel_index: number;
    /** Rank the system assigned at render time. */
    system_rank_index: number;
  };

export type TransactionConvertedTelemetry = PredictiveCurationTelemetryBase &
  SpacetimeTelemetryContext & {
    event_type: "TRANSACTION_CONVERTED";
    source_hub_id: string;
    transaction_kind: "connect" | "purchase" | "sync";
    /** Newly factory-emitted resource id when known. */
    created_resource_id?: string | null;
  };

export type PredictiveCurationTelemetryEvent =
  | ResourceImpressionTelemetry
  | ResourceDismissedTelemetry
  | ResourceManualPickTelemetry
  | TransactionConvertedTelemetry;

export type PredictiveCurationTelemetryBatch = {
  events: readonly PredictiveCurationTelemetryEvent[];
  /** Client batch id for idempotent replay debugging. */
  batch_id: string;
  client_sent_at: string;
};
