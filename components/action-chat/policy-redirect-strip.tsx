"use client";

import type { PolicyWire } from "@/lib/policy/types";
import { VITALITY_PRESETS, type VitalityTag } from "@/lib/vitality/types";
import { cn } from "@/lib/utils";

const VITALITY_EMOJI: Record<VitalityTag, string> = {
  Apex: "⚡",
  Haven: "🌿",
  Nexus: "🤝",
  Sentinel: "🛡️",
};

const VITALITY_CHIP: Record<VitalityTag, string> = {
  Apex: "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100",
  Haven: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  Nexus: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
  Sentinel: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
};

type PolicyRedirectStripProps = {
  wire: PolicyWire;
  onRedirect: (prompt: string) => void;
  className?: string;
};

/** Site layer — persona copy is in wire.message; chips come from vitality registry. */
export function PolicyRedirectStrip({
  wire,
  onRedirect,
  className,
}: PolicyRedirectStripProps) {
  const tag = wire.redirect_tag ?? "Haven";
  const preset = VITALITY_PRESETS[tag];

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-rimvio-surface p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-3 text-sm font-semibold text-slate-800">
        {VITALITY_EMOJI[tag]} {wire.redirect_title || `${preset.title} 추천`}
      </div>
      <div className="flex flex-wrap gap-2">
        {wire.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onRedirect(option.prompt)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              VITALITY_CHIP[tag]
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
