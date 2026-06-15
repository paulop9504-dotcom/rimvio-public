"use client";

import type { ScheduleAdvisoryWire } from "@/lib/schedule/schedule-block-types";
import { VITALITY_PRESETS } from "@/lib/vitality/types";
import { formatKoreanTimeLabel } from "@/lib/schedule/schedule-time-utils";
import { cn } from "@/lib/utils";

type ScheduleAdvisoryStripProps = {
  wire: ScheduleAdvisoryWire;
  onSelectOption: (prompt: string) => void;
  className?: string;
};

const VITALITY_CHIP: Record<string, string> = {
  Apex: "bg-violet-100 text-violet-800",
  Haven: "bg-emerald-100 text-emerald-800",
  Nexus: "bg-sky-100 text-sky-800",
  Sentinel: "bg-amber-100 text-amber-800",
};

/** TIMELINE conflict advisory ??recommendation + reason + actions. */
export function ScheduleAdvisoryStrip({
  wire,
  onSelectOption,
  className,
}: ScheduleAdvisoryStripProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
        <p className="text-[12px] font-semibold text-amber-900">?�정 겹침 · Sentinel</p>
        <p className="mt-1 text-[13px] leading-relaxed text-amber-950/90">{wire.reason}</p>
      </div>

      <ol className="relative space-y-3 border-l-2 border-[#4A90E2]/40 pl-4 ml-2">
        {wire.events.map((event) => (
          <li key={event.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[23px] top-2 size-3 rounded-full border-2 border-white bg-[#4A90E2]"
            />
            <div className="rounded-xl border border-border bg-rimvio-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-bold text-foreground">{event.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    VITALITY_CHIP[event.vitality]
                  )}
                >
                  {VITALITY_PRESETS[event.vitality].subtitle}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {formatKoreanTimeLabel(event.startMinutes)} · ??{event.durationMinutes}�?
                {event.id === wire.recommendedEventId ? " · 조정 추천" : " · ?��? 추천"}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        {wire.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onSelectOption(option.prompt)}
            className="rounded-lg bg-[#4A90E2] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3A7BC8]"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
