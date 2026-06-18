"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { isStandalonePwa } from "@/lib/platform/device";
import {
  labelForScheduleMedium,
  readScheduleMedium,
  SCHEDULE_MEDIUM_OPTIONS,
  SCHEDULE_MEDIUM_UPDATED,
  writeScheduleMedium,
  type ScheduleMedium,
} from "@/lib/preferences/schedule-medium";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";
import { Bell, Calendar, ClipboardCopy, Check } from "lucide-react";

const ICONS = {
  rimvio: Bell,
  google_calendar: Calendar,
  copy: ClipboardCopy,
} as const;

export function SettingsScheduleMediumPanel({ className }: { className?: string }) {
  const copy = useCopy();
  const [selected, setSelected] = useState<ScheduleMedium>("rimvio");
  const [standalone, setStandalone] = useState(false);

  const sync = useCallback(() => {
    setSelected(readScheduleMedium());
    setStandalone(isStandalonePwa());
  }, []);

  useEffect(() => {
    sync();
    const onUpdate = () => sync();
    window.addEventListener(SCHEDULE_MEDIUM_UPDATED, onUpdate);
    return () => window.removeEventListener(SCHEDULE_MEDIUM_UPDATED, onUpdate);
  }, [sync]);

  const handleSelect = (medium: ScheduleMedium) => {
    writeScheduleMedium(medium);
    setSelected(medium);
    toast.success(copy.settings.scheduleSaved);
  };

  return (
    <section className={cn("overflow-hidden p-4", IOS.cardSm, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{copy.settings.scheduleTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.settings.scheduleHint}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-rimvio-neon-purple/10 px-2.5 py-1 text-[10px] font-semibold text-rimvio-neon-cyan">
          {copy.settings.scheduleBadge}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {SCHEDULE_MEDIUM_OPTIONS.map((option) => {
          const active = selected === option.id;
          const Icon = ICONS[option.id];
          const showPwaHint =
            option.id === "rimvio" && !standalone && active;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                active
                  ? "bg-rimvio-neon-purple/8 ring-2 ring-[#007AFF]/35 shadow-sm"
                  : "bg-rimvio-surface-muted ring-1 ring-rimvio-neon-purple/12 hover:bg-rimvio-surface-raised"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-lg",
                  active ? "bg-rimvio-neon-purple text-white" : "bg-rimvio-surface text-foreground"
                )}
                aria-hidden
              >
                {active ? (
                  <Check className="size-5" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-5" strokeWidth={2} />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {option.emoji} {option.label}
                  </span>
                  {option.badge ? (
                    <span className="rounded-full bg-[#FF9500]/12 px-2 py-0.5 text-[10px] font-semibold text-[#C93400]">
                      {option.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {option.hint}
                </span>
                {showPwaHint ? (
                  <span className="mt-1.5 block text-[11px] font-medium text-[#FF9500]">
                    {copy.settings.schedulePwaHint}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-xl bg-rimvio-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {copy.settings.scheduleActive(labelForScheduleMedium(selected))}
      </p>
    </section>
  );
}
