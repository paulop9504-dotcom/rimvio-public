"use client";

import { useMemo, useState } from "react";
import {
  readAnalyticsEvents,
  summarizeAnalyticsEvents,
} from "@/lib/analytics";

function formatRate(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

function formatDay1Reopen(events: ReturnType<typeof readAnalyticsEvents>) {
  const sessionsByDay = new Map<string, Set<string>>();

  for (const event of events) {
    const day = new Date(event.ts).toISOString().slice(0, 10);
    const bucket = sessionsByDay.get(day) ?? new Set<string>();
    bucket.add(event.sessionId);
    sessionsByDay.set(day, bucket);
  }

  const days = [...sessionsByDay.keys()].sort();
  if (days.length < 2) {
    return "—";
  }

  let returning = 0;
  let total = 0;

  for (let index = 0; index < days.length - 1; index += 1) {
    const today = sessionsByDay.get(days[index])!;
    const tomorrow = sessionsByDay.get(days[index + 1])!;
    total += today.size;
    for (const sessionId of today) {
      if (tomorrow.has(sessionId)) {
        returning += 1;
      }
    }
  }

  if (total <= 0) {
    return "—";
  }

  return `${Math.round((returning / total) * 100)}%`;
}

/** PMF core metrics — Share→Primary / Share→Done / session return proxy */
export function PmfMetricsPanel() {
  const [version, setVersion] = useState(0);

  const summary = useMemo(() => {
    void version;
    return summarizeAnalyticsEvents(readAnalyticsEvents());
  }, [version]);

  const day1Proxy = useMemo(() => {
    void version;
    return formatDay1Reopen(readAnalyticsEvents());
  }, [version]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            PMF Core
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share → Primary click / Done(skip) / D1 재오픈 proxy
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((current) => current + 1)}
          className="rounded-xl border px-3 py-1.5 text-sm"
        >
          새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Share → Action</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatRate(summary.funnelRates.shareToDone)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ready→action {formatRate(summary.funnelRates.readyToAction)}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Share → Done(skip)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatRate(
              summary.funnel.share > 0
                ? summary.funnel.now_done / summary.funnel.share
                : null
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            skip {summary.funnel.now_done} / share {summary.funnel.share}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">D1 재오픈 proxy</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{day1Proxy}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            sessions {summary.sessionCount}
          </p>
        </div>
      </div>
    </div>
  );
}
