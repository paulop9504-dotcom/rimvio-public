"use client";

import { useCallback, useMemo, useState } from "react";
import { DecisionCard } from "@/components/threadline/decision-card";
import { DeferredRecoveryStrip } from "@/components/threadline/deferred-recovery-strip";
import { DeltaReviewSheet } from "@/components/threadline/delta-review-sheet";
import type { DecisionCardModel } from "@/lib/threadline/threadline-types";
import { threadlineHeaderStatus } from "@/lib/threadline/validate-kernel-guards";
import { cn } from "@/lib/utils";

type TodayThreadProps = {
  cards: DecisionCardModel[];
  deferredCards?: DecisionCardModel[];
  onResolveChip: (cardId: string, chipId: string) => void;
  onRestoreDeferred?: (cardId: string) => void;
  className?: string;
};

export function TodayThread({
  cards,
  deferredCards = [],
  onResolveChip,
  onRestoreDeferred,
  className,
}: TodayThreadProps) {
  const [reviewCardId, setReviewCardId] = useState<string | null>(null);

  const visible = useMemo(
    () => cards.filter((c) => c.state !== "DEFERRED"),
    [cards]
  );

  const headerStatus = threadlineHeaderStatus(visible);
  const reviewCard = visible.find((c) => c.id === reviewCardId);

  const scrollToWaiting = useCallback(() => {
    const el = document.querySelector('[data-card-state="WAITING"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  if (visible.length === 0 && deferredCards.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("px-3 py-3", className)}
      aria-label="오늘"
      data-timeline-segment="decisions"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold text-slate-800">Today</h2>
        {visible.length > 0 ? (
          <button
            type="button"
            onClick={scrollToWaiting}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              headerStatus === "needs_one_tap"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            )}
          >
            {headerStatus === "needs_one_tap" ? "한 번만 탭" : "정리됨"}
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {visible.map((card) => (
          <DecisionCard
            key={card.id}
            card={card}
            onResolveChip={onResolveChip}
            onReview={setReviewCardId}
          />
        ))}
      </div>

      {onRestoreDeferred ? (
        <DeferredRecoveryStrip
          deferred={deferredCards}
          onRestore={onRestoreDeferred}
        />
      ) : null}

      <DeltaReviewSheet
        open={Boolean(reviewCard)}
        title={reviewCard?.title ?? ""}
        deltas={reviewCard?.reviewDeltas ?? []}
        onClose={() => setReviewCardId(null)}
      />
    </section>
  );
}
