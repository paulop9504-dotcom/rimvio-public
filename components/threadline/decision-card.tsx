"use client";

import { MoreHorizontal } from "lucide-react";
import type { DecisionCardModel } from "@/lib/threadline/threadline-types";
import { cn } from "@/lib/utils";

const RAIL: Record<DecisionCardModel["state"], string> = {
  WAITING: "bg-amber-400",
  WORKING: "bg-sky-400",
  DONE: "bg-emerald-500",
  DEFERRED: "bg-transparent",
};

type DecisionCardProps = {
  card: DecisionCardModel;
  onResolveChip?: (cardId: string, chipId: string) => void;
  onReview?: (cardId: string) => void;
};

export function DecisionCard({
  card,
  onResolveChip,
  onReview,
}: DecisionCardProps) {
  if (card.state === "DEFERRED") {
    return null;
  }

  return (
    <article
      className="flex gap-3 rounded-2xl border border-border bg-rimvio-surface px-3 py-3 shadow-sm"
      data-card-state={card.state}
      aria-label={card.title}
    >
      <div
        className={cn("mt-1 w-1 shrink-0 rounded-full", RAIL[card.state])}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-slate-900">{card.title}</h3>
          {card.state === "DONE" && onReview ? (
            <button
              type="button"
              aria-label="무엇이 바뀌었는지"
              className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100"
              onClick={() => onReview(card.id)}
            >
              <MoreHorizontal className="size-4" />
            </button>
          ) : null}
        </div>

        <p className="mt-1 text-[13px] leading-snug text-slate-600">
          <span className="font-medium text-slate-500">Because · </span>
          {card.because}
        </p>

        {card.state === "WAITING" && card.chips?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {card.chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={card.state !== "WAITING"}
                onClick={() => onResolveChip?.(card.id, chip.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  chip.role === "default"
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : chip.role === "escape"
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "border border-indigo-200 bg-rimvio-surface text-indigo-700 hover:bg-indigo-50"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}

        {card.state === "WORKING" ? (
          <p className="mt-2 text-[12px] text-sky-600">처리 중…</p>
        ) : null}

        {card.state === "DONE" && card.settledLine ? (
          <p className="mt-2 text-[13px] font-medium text-emerald-700">
            {card.settledLine}
          </p>
        ) : null}
      </div>
    </article>
  );
}
