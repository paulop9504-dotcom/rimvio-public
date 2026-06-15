"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aggregateBurnerWeights,
  BURNER_EMOJI,
  burnerLabelsFromCopy,
  describeBurnerCoaching,
  LIFE_BURNERS,
  countOpenLinks,
} from "@/lib/behavior/burners";
import {
  COMPLETION_UPDATED,
  readTodayCompletions,
} from "@/lib/behavior/completion";
import { useCopy } from "@/hooks/use-copy";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type InboxCoachingStripProps = {
  links: LinkRow[];
};

export function InboxCoachingStrip({ links }: InboxCoachingStripProps) {
  const copy = useCopy();
  const [todayDone, setTodayDone] = useState(0);

  useEffect(() => {
    const sync = () => setTodayDone(readTodayCompletions().length);
    sync();
    window.addEventListener(COMPLETION_UPDATED, sync);
    return () => window.removeEventListener(COMPLETION_UPDATED, sync);
  }, []);

  const openCount = countOpenLinks(links);
  const weights = useMemo(() => aggregateBurnerWeights(links), [links]);
  const labels = useMemo(() => burnerLabelsFromCopy(copy), [copy]);
  const coaching = useMemo(
    () => describeBurnerCoaching(weights, openCount, new Date().getHours(), copy),
    [weights, openCount, copy]
  );

  if (openCount === 0 && todayDone === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-rimvio-surface-muted/80 px-4 py-3 ring-1 ring-rimvio-neon-purple/12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-foreground">
          {copy.inbox.openLinksCount(openCount)}
          {todayDone > 0 ? (
            <span className="text-[#34C759]">
              {copy.inbox.clearedToday(todayDone)}
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/[0.06]">
        {LIFE_BURNERS.map((burner) => {
          const weight = weights[burner] ?? 0;
          if (weight <= 0) {
            return null;
          }

          return (
            <div
              key={burner}
              className={cn(
                "h-full min-w-[4px] transition-all",
                burner === "work" && "bg-rimvio-neon-purple",
                burner === "health" && "bg-[#34C759]",
                burner === "friends" && "bg-[#FF9500]",
                burner === "growth" && "bg-[#AF52DE]"
              )}
              style={{ flexGrow: weight }}
              title={`${labels[burner]} ${Math.round(weight * 100)}%`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {LIFE_BURNERS.map((burner) =>
          (weights[burner] ?? 0) > 0 ? (
            <span key={burner}>
              {BURNER_EMOJI[burner]} {labels[burner]}{" "}
              {Math.round((weights[burner] ?? 0) * 100)}%
            </span>
          ) : null
        )}
      </div>

      {coaching ? (
        <p className="mt-2 text-[13px] leading-snug text-foreground/85">{coaching}</p>
      ) : null}
    </div>
  );
}
