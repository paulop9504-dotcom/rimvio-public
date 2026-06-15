"use client";

import type { MorningBriefingWire } from "@/lib/morning-orchestrator/types";

type PresentationDashboardStripProps = {
  briefing: MorningBriefingWire;
};

/** DASHBOARD mode ??summary + priority actions, no image carousel. */
export function PresentationDashboardStrip({ briefing }: PresentationDashboardStripProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-[#F9FAFB] p-3.5">
      {briefing.greeting ? (
        <p className="text-[14px] font-semibold leading-snug text-foreground">
          {briefing.greeting}
        </p>
      ) : null}

      {briefing.daily_insight?.summary ? (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {briefing.daily_insight.summary}
        </p>
      ) : null}

      {briefing.priority_actions.length > 0 ? (
        <ul className="space-y-1.5">
          {briefing.priority_actions.slice(0, 4).map((action) => (
            <li
              key={`${action.category}-${action.content}`}
              className="flex items-start gap-2 rounded-xl bg-rimvio-surface px-2.5 py-2 text-[12px]"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-[#4A90E2]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                {action.category}
              </span>
              <span className="text-[#374151]">{action.content}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
