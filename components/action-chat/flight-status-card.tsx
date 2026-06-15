"use client";

import type { FlightStatusCardWire } from "@/lib/trip-controller/types";
import { cn } from "@/lib/utils";

type FlightStatusCardProps = {
  wire: FlightStatusCardWire;
  onMainAction?: (wire: FlightStatusCardWire) => void;
  onShadowAction?: (action: FlightStatusCardWire["shadow_actions"][number]) => void;
  className?: string;
};

/** Dynamic flight status card — shows only what matters now. */
export function FlightStatusCardView({
  wire,
  onMainAction,
  onShadowAction,
  className,
}: FlightStatusCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-sm",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
        ✈️ Trip Controller
      </p>
      <p className="mt-1 text-[15px] font-semibold text-indigo-950">{wire.card.title}</p>
      <p className="mt-0.5 text-[13px] font-medium text-indigo-700">{wire.card.status}</p>
      <ul className="mt-2 space-y-0.5">
        {wire.card.info_lines.map((line) => (
          <li key={line} className="text-[13px] text-indigo-900/85">
            {line}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onMainAction?.(wire)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        🎫 {wire.main_action.label}
      </button>
      {wire.shadow_actions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {wire.shadow_actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onShadowAction?.(action)}
              className="rounded-full border border-indigo-200 bg-rimvio-surface px-3 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
