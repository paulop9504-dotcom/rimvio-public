"use client";

import type { TimeChoiceExecuteInput } from "@/lib/time-decision/time-choice-execute-input";
import type { TimeChoiceOption } from "@/lib/time-decision/types";
import { cn } from "@/lib/utils";

type TimeChoiceStripProps = {
  wire: import("@/lib/time-decision/types").TimeChoiceWire;
  onSelectOption: (input: TimeChoiceExecuteInput) => void;
  className?: string;
};

/** Time verification — calendar vs countdown before Missing/place flows. */
export function TimeChoiceStrip({
  wire,
  onSelectOption,
  className,
}: TimeChoiceStripProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 shadow-sm",
        className
      )}
    >
      <p className="text-[12px] font-semibold text-amber-900">
        ⏱ {wire.headline}
        {wire.time_locked ? " · 시간 확정" : ""}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-amber-950/90">
        {wire.empathy_line}
      </p>
      {wire.missing_place_note ? (
        <p className="mt-2 text-[12px] text-amber-800/80">{wire.missing_place_note}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {wire.options.map((option: TimeChoiceOption) => (
          <button
            key={option.label}
            type="button"
            onClick={() =>
              onSelectOption({
                mode: option.mode,
                datetime: wire.datetime_iso,
                task: wire.task_label,
                prompt: option.prompt,
              })
            }
            className="rounded-full border border-amber-200 bg-rimvio-surface px-3.5 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-100"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
