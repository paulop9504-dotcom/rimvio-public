"use client";

import type { ExperienceChoiceWire } from "@/lib/experience/types";
import { cn } from "@/lib/utils";

type ExperienceChoiceStripProps = {
  wire: ExperienceChoiceWire;
  onSelectOption: (prompt: string) => void;
  className?: string;
};

/** MEMORY empathy buffer — ask before efficiency shortcuts. */
export function ExperienceChoiceStrip({
  wire,
  onSelectOption,
  className,
}: ExperienceChoiceStripProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-sky-200/90 bg-sky-50/60 p-4 shadow-sm",
        className
      )}
    >
      <p className="text-[12px] font-semibold text-sky-900">
        🤝 함께하는 시간 · Nexus
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-sky-950/90">
        {wire.empathy_line}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {wire.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onSelectOption(option.prompt)}
            className="rounded-full border border-sky-200 bg-rimvio-surface px-3.5 py-2 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
