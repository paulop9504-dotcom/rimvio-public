"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import {
  ACTION_TRUST_UPDATED,
  labelForTrustLevelMode,
  nextTrustMilestone,
  readActionTrustState,
  resolveTrustStaircaseStage,
  stageLabel,
  TRUST_LEVEL_OPTIONS,
  writeActionTrustMode,
  type TrustLevelMode,
} from "@/lib/preferences/action-trust";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";
import { Bot, Check, Handshake, Sparkles, TrendingUp } from "lucide-react";

const ICONS = {
  auto: TrendingUp,
  beginner: Bot,
  partner: Handshake,
  heavy: Sparkles,
} as const;

export function SettingsTrustLevelPanel({ className }: { className?: string }) {
  const copy = useCopy();
  const [selected, setSelected] = useState<TrustLevelMode>("auto");
  const [successScore, setSuccessScore] = useState(0);

  const sync = useCallback(() => {
    const state = readActionTrustState();
    setSelected(state.mode);
    setSuccessScore(state.successScore);
  }, []);

  useEffect(() => {
    sync();
    const onUpdate = () => sync();
    window.addEventListener(ACTION_TRUST_UPDATED, onUpdate);
    return () => window.removeEventListener(ACTION_TRUST_UPDATED, onUpdate);
  }, [sync]);

  const stage = resolveTrustStaircaseStage({ mode: selected, successScore });
  const milestone = selected === "auto" ? nextTrustMilestone(successScore) : null;

  const handleSelect = (mode: TrustLevelMode) => {
    writeActionTrustMode(mode);
    setSelected(mode);
    toast.success(copy.settings.trustSaved);
  };

  return (
    <section className={cn("overflow-hidden p-4", IOS.cardSm, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{copy.settings.trustTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.settings.trustHint}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-rimvio-neon-purple/10 px-2.5 py-1 text-[10px] font-semibold text-rimvio-neon-purple">
          {copy.settings.trustBadge}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-[#F7F6FF] px-3 py-2.5 text-[11px] leading-relaxed text-[#374151]">
        <p className="font-semibold text-rimvio-neon-purple">
          {copy.settings.trustStageActive(stageLabel(stage))}
        </p>
        <p className="mt-1 text-muted-foreground">
          {copy.settings.trustScoreLine(successScore)}
          {milestone
            ? ` · ${copy.settings.trustNextMilestone(milestone.target - successScore, milestone.label)}`
            : null}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {TRUST_LEVEL_OPTIONS.map((option) => {
          const active = selected === option.id;
          const Icon = ICONS[option.id];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                active
                  ? "bg-rimvio-neon-purple/8 ring-2 ring-[#7B61FF]/35 shadow-sm"
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
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-xl bg-rimvio-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {copy.settings.trustActive(labelForTrustLevelMode(selected))}
      </p>
    </section>
  );
}
