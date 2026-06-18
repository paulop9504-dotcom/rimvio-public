import type {
  PredictiveCurationTelemetryBatch,
  PredictiveCurationTelemetryEvent,
} from "@/types/telemetry";

const DEFAULT_ENDPOINT = "/api/telemetry/curation";
const MAX_BATCH = 24;
const IDLE_TIMEOUT_MS = 2800;
const DEBOUNCE_MS = 160;

type FlushMode = "idle" | "immediate";

/**
 * Non-blocking curation telemetry — batches on idle / async queue.
 * Separate from archive ActionTelemetry (rollup spine); feeds Predictive Curation AI.
 */
export class TelemetryLogger {
  private readonly endpoint: string;
  private queue: PredictiveCurationTelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private idleFlushPending = false;

  constructor(endpoint: string = DEFAULT_ENDPOINT) {
    this.endpoint = endpoint;
  }

  enqueue(event: PredictiveCurationTelemetryEvent): void {
    this.queue.push(event);
    if (this.queue.length >= MAX_BATCH) {
      this.scheduleFlush("immediate");
      return;
    }
    this.scheduleFlush("idle");
  }

  enqueueMany(events: readonly PredictiveCurationTelemetryEvent[]): void {
    for (const event of events) {
      this.enqueue(event);
    }
  }

  /** Force drain — tests and pagehide only. */
  flushSync(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.idleFlushPending = false;
    void this.flush();
  }

  private scheduleFlush(mode: FlushMode): void {
    if (mode === "immediate") {
      if (this.flushTimer !== null) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      this.idleFlushPending = false;
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, 0);
      return;
    }

    if (this.flushTimer !== null || this.idleFlushPending) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.runIdleFlush();
    }, DEBOUNCE_MS);
  }

  private runIdleFlush(): void {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      this.idleFlushPending = true;
      window.requestIdleCallback(
        () => {
          this.idleFlushPending = false;
          void this.flush();
        },
        { timeout: IDLE_TIMEOUT_MS },
      );
      return;
    }
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = this.queue.splice(0, MAX_BATCH);
    const batch: PredictiveCurationTelemetryBatch = {
      events,
      batch_id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      client_sent_at: new Date().toISOString(),
    };

    if (process.env.NODE_ENV !== "production") {
      console.debug("[TelemetryLogger:curation]", batch);
    }

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(batch)], { type: "application/json" });
        const sent = navigator.sendBeacon(this.endpoint, blob);
        if (sent) {
          return;
        }
      } catch {
        /* fall through to fetch */
      }
    }

    try {
      void fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
        keepalive: true,
        credentials: "same-origin",
      });
    } catch {
      /* drop-on-failure — never block UI */
    }
  }
}

let singleton: TelemetryLogger | null = null;

export function getCurationTelemetryLogger(): TelemetryLogger {
  if (!singleton) {
    singleton = new TelemetryLogger();
  }
  return singleton;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    getCurationTelemetryLogger().flushSync();
  });
}
