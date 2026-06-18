"use client";

import type { PackingChecklistWire } from "@/lib/trip-controller/types";
import { cn } from "@/lib/utils";

type PackingChecklistStripProps = {
  wire: PackingChecklistWire;
  onToggleItem: (tripId: string, itemId: string) => void;
  className?: string;
};

/** Smart interactive packing checklist — tap toggles [ ] ↔ [v]. */
export function PackingChecklistStrip({
  wire,
  onToggleItem,
  className,
}: PackingChecklistStripProps) {
  const done = wire.list.filter((item) => item.checked).length;
  const total = wire.list.length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-emerald-900">
          🧳 {wire.destinationLabel} · 짐 체크리스트
        </p>
        <span className="text-[11px] font-medium text-emerald-700">
          {done}/{total}
        </span>
      </div>
      {wire.completionMessage ? (
        <p className="mt-2 text-[13px] font-medium text-emerald-800">
          {wire.completionMessage}
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {wire.list.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggleItem(wire.tripId, item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                item.checked
                  ? "border-emerald-300 bg-rimvio-surface text-emerald-900 line-through opacity-80"
                  : "border-emerald-100 bg-rimvio-surface/80 text-emerald-950 hover:bg-rimvio-surface"
              )}
            >
              <span className="font-mono text-[13px]">{item.checked ? "[v]" : "[ ]"}</span>
              <span>{item.item}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
