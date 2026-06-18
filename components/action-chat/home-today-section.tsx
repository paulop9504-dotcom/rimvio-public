"use client";

import { formatAxisLastActive, type TodayAxisCard } from "@/lib/home/derive-today-axis";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type HomeTodaySectionProps = {
  cards: TodayAxisCard[];
  activeContainerId?: string | null;
  onSelectContainer: (containerId: string) => void;
  className?: string;
};

export function HomeTodaySection({
  cards,
  activeContainerId,
  onSelectContainer,
  className,
}: HomeTodaySectionProps) {
  const copy = useCopy();

  if (cards.length === 0) {
    return (
      <section className={cn("px-4 pb-2", className)} aria-label="?�늘">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          TODAY
        </p>
        <p className="rounded-2xl border border-dashed border-border bg-rimvio-surface/60 px-4 py-5 text-[13px] text-muted-foreground">
          {copy.action.todayEmpty}
        </p>
      </section>
    );
  }

  return (
    <section className={cn("px-4 pb-2", className)} aria-label="?�늘">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
        TODAY
      </p>
      <div className="space-y-2">
        {cards.map((card) => {
          const active = activeContainerId === card.containerId;
          return (
            <button
              key={card.containerId}
              type="button"
              onClick={() => onSelectContainer(card.containerId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-[#4A90E2]/35 bg-rimvio-surface shadow-[0_4px_16px_-8px_rgba(74,144,226,0.45)]"
                  : "border-border bg-rimvio-surface/80 hover:bg-rimvio-surface"
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: card.accent }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[#1F2937]">{card.title}</p>
                <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                  {formatAxisLastActive(card.lastActiveAt)}
                  {card.eventCount > 0 ? ` · ???�벤??${card.eventCount}` : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
