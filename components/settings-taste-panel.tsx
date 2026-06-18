"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import { IOS } from "@/lib/ui/ios-surface";
import {
  MAX_SUITE_TASTE,
  readSuiteTaste,
  SUITE_TASTE_OPTIONS,
  SUITE_TASTE_UPDATED,
  toggleSuiteTaste,
} from "@/lib/preferences/suite-taste";
import { cn } from "@/lib/utils";

export function SettingsTastePanel({ className }: { className?: string }) {
  const copy = useCopy();
  const [selected, setSelected] = useState<SmartSuite[]>([]);

  const sync = useCallback(() => {
    setSelected(readSuiteTaste());
  }, []);

  useEffect(() => {
    sync();
    const onUpdate = () => sync();
    window.addEventListener(SUITE_TASTE_UPDATED, onUpdate);
    return () => window.removeEventListener(SUITE_TASTE_UPDATED, onUpdate);
  }, [sync]);

  const handleToggle = (suite: SmartSuite) => {
    const next = toggleSuiteTaste(suite);
    setSelected(next);
    toast.success(
      next.length ? copy.settings.tasteSaved : copy.settings.tasteAuto
    );
  };

  return (
    <section className={cn("p-4", IOS.cardSm, className)}>
      <h2 className="text-sm font-semibold">{copy.settings.tasteTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {copy.settings.tasteHint(MAX_SUITE_TASTE)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUITE_TASTE_OPTIONS.map((option) => {
          const active = selected.includes(option.suite);
          return (
            <button
              key={option.suite}
              type="button"
              aria-pressed={active}
              onClick={() => handleToggle(option.suite)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98]",
                active
                  ? "bg-rimvio-neon-purple text-white shadow-sm"
                  : "bg-rimvio-surface-muted text-foreground ring-1 ring-black/[0.05]"
              )}
            >
              <span aria-hidden>{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {selected.length
          ? copy.settings.tasteActive(selected.map((suite) => {
              const match = SUITE_TASTE_OPTIONS.find((item) => item.suite === suite);
              return match ? `${match.emoji} ${match.label}` : suite;
            }).join(" · "))
          : copy.settings.tasteAutoHint}
      </p>
    </section>
  );
}
