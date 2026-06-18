"use client";

import type { ReviewDeltaRow } from "@/lib/threadline/threadline-types";

type DeltaReviewSheetProps = {
  open: boolean;
  title: string;
  deltas: ReviewDeltaRow[];
  onClose: () => void;
};

/** Kernel §9 — read-only delta review (no state mutation). */
export function DeltaReviewSheet({
  open,
  title,
  deltas,
  onClose,
}: DeltaReviewSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4"
      role="dialog"
      aria-label="무엇이 바뀌었는지"
    >
      <div className="w-full max-w-md rounded-2xl bg-rimvio-surface p-4 shadow-xl">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-[12px] text-slate-500">확인만 할 수 있어요. 일정은 바뀌지 않아요.</p>
        <ul className="mt-3 space-y-2">
          {deltas.length === 0 ? (
            <li className="text-[13px] text-slate-600">변경 내용이 없어요.</li>
          ) : (
            deltas.map((row) => (
              <li
                key={`${row.label}-${row.value}`}
                className="flex justify-between gap-3 text-[13px]"
              >
                <span className="font-medium text-slate-500">{row.label}</span>
                <span className="text-slate-800">{row.value}</span>
              </li>
            ))
          )}
        </ul>
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-slate-900 py-2.5 text-[14px] font-semibold text-white"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
