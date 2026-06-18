"use client";

import { Plane } from "lucide-react";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import type { DepartureHubOption } from "@/lib/globe/suggest-departure-hub-options";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubDraftPickerProps = {
  options: readonly DepartureHubOption[];
  selectedIds: readonly DepartureHubAirportId[];
  disabled?: boolean;
  onToggle: (airportId: DepartureHubAirportId) => void;
};

/** Pre-create — pick hubs before the context is committed to the globe. */
export function GlobeContextHubDraftPicker({
  options,
  selectedIds,
  disabled = false,
  onToggle,
}: GlobeContextHubDraftPickerProps) {
  if (options.length === 0) {
    return null;
  }

  const selected = new Set(selectedIds);

  return (
    <div className="space-y-2" data-globe-context-hub-draft>
      <div>
        <p className="text-[12px] font-semibold text-primary">
          {copy.globe.contextHubEyebrow}
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-foreground">
          {copy.globe.contextHubDraftTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {copy.globe.contextHubDraftBody}
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.has(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(option.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground active:bg-muted",
                  disabled && "pointer-events-none opacity-50",
                )}
                data-context-hub-draft={option.id}
                aria-pressed={active}
              >
                <Plane className="size-3.5" aria-hidden />
                {option.shortLabelKo}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
