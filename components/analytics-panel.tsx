"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearAnalyticsEvents,
  exportAnalyticsEventsJson,
  readAnalyticsEvents,
  summarizeAnalyticsEvents,
} from "@/lib/analytics";

function formatRate(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

function topEntries(map: Record<string, number>, limit = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function AnalyticsPanel() {
  const [version, setVersion] = useState(0);

  const summary = useMemo(() => {
    void version;
    return summarizeAnalyticsEvents(readAnalyticsEvents());
  }, [version]);

  const refresh = () => setVersion((current) => current + 1);

  const download = () => {
    const blob = new Blob([exportAnalyticsEventsJson()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `blink-analytics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    clearAnalyticsEvents();
    refresh();
  };

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Tier 1 Analytics
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            익명 · localStorage + Supabase flush · 최대 800건 · 로그인 없음
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={refresh}>
            새로고침
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={download}>
            JSON
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={clear}>
            비우기
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="font-medium">이벤트</p>
          <p className="mt-1 text-muted-foreground">
            {summary.eventCount}건 · 세션 {summary.sessionCount}개
          </p>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="font-medium">Share → Done</p>
          <p className="mt-1 text-muted-foreground">
            share {summary.funnel.share} → ready {summary.funnel.now_ready} → action{" "}
            {summary.funnel.now_action} → done {summary.funnel.now_done}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            전환: share→done {formatRate(summary.funnelRates.shareToDone)} · copy 성공{" "}
            {formatRate(summary.copy.copySuccessRate)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatList title="Enricher TOP" entries={topEntries(summary.enrichByEnricher)} />
        <StatList title="도메인 TOP" entries={topEntries(summary.enrichByDomain)} />
        <StatList title="액션 클릭 TOP" entries={topEntries(summary.actionClicksByLabel)} />
        <StatList
          title="Fallback"
          entries={[
            ["titleFromDomain", summary.fallback.titleFromDomain],
            ["imageFromFallback", summary.fallback.imageFromFallback],
            ["anyFallback", summary.fallback.anyFallback],
            ["total enrich", summary.fallback.total],
          ]}
        />
      </div>
    </div>
  );
}

function StatList({
  title,
  entries,
}: {
  title: string;
  entries: [string, number][];
}) {
  return (
    <div className="rounded-2xl border border-border/50 p-4">
      <p className="text-sm font-medium">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">아직 데이터 없음</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {entries.map(([key, count]) => (
            <li key={key} className="flex justify-between gap-3">
              <span className="truncate">{key}</span>
              <span className="shrink-0 font-medium text-foreground">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
