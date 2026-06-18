"use client";

import type { DecisionCardModel } from "@/lib/threadline/threadline-types";

type DeferredRecoveryStripProps = {
  deferred: DecisionCardModel[];
  onRestore: (cardId: string) => void;
};

/** v1.1 — restore DEFERRED without new Add intent. */
export function DeferredRecoveryStrip({
  deferred,
  onRestore,
}: DeferredRecoveryStripProps) {
  if (deferred.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">나중에 미룬 항목</p>
      {deferred.map((card) => (
        <div
          key={card.id}
          className="flex items-center justify-between gap-2"
        >
          <span className="truncate text-[13px] text-slate-700">{card.title}</span>
          <button
            type="button"
            className="shrink-0 rounded-full bg-rimvio-surface px-2.5 py-1 text-[12px] font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100"
            onClick={() => onRestore(card.id)}
          >
            다시 이어하기
          </button>
        </div>
      ))}
    </div>
  );
}
