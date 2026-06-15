"use client";

import { useMemo, useState } from "react";
import { RimvioActionButton } from "@/components/ui/rimvio-action-button";
import { buildLifeDomainActions } from "@/lib/life-domain-actions/build-actions";
import {
  LIFE_DOMAIN_CATALOG,
  type LifeDomainKey,
} from "@/lib/life-domain-actions";
import { runLinkAction } from "@/lib/actions/execute-link-action";
import type { LinkActionItem } from "@/types/database";
import { cn } from "@/lib/utils";

type LifeDomainActionBoardProps = {
  onSendPrompt?: (message: string) => void;
  className?: string;
  defaultDomain?: LifeDomainKey;
  compact?: boolean;
};

export function LifeDomainActionBoard({
  onSendPrompt,
  className,
  defaultDomain = "study",
  compact = false,
}: LifeDomainActionBoardProps) {
  const [activeDomain, setActiveDomain] = useState<LifeDomainKey>(defaultDomain);

  const entry = useMemo(
    () => LIFE_DOMAIN_CATALOG.find((item) => item.key === activeDomain) ?? LIFE_DOMAIN_CATALOG[0],
    [activeDomain],
  );

  const actions = useMemo(() => buildLifeDomainActions(activeDomain), [activeDomain]);
  const mainActions = actions.filter(
    (action) => action.payload?.action_tier === "MAIN" || action.payload?.domainPrimary,
  );
  const auxActions = actions.filter(
    (action) => action.payload?.action_tier !== "MAIN" && !action.payload?.domainPrimary,
  );

  const handleAction = async (action: LinkActionItem) => {
    if (action.href?.startsWith("rimvio://chat/followup")) {
      const url = new URL(action.href.replace("rimvio://", "https://rimvio.local/"));
      const prompt = url.searchParams.get("q") ?? action.label;
      onSendPrompt?.(prompt);
      return;
    }

    if (action.href?.startsWith("rimvio://")) {
      onSendPrompt?.(action.label);
      return;
    }

    await runLinkAction(action);
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#E8ECF4] bg-rimvio-surface shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="border-b border-[#F1F5F9] px-3 py-2.5">
        <p className="text-[13px] font-semibold text-slate-800">생활 도메인 액션</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {compact ? "탭해서 바로 실행" : "7개 영역 · 각 10개 액션"}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
        {LIFE_DOMAIN_CATALOG.map((domain) => {
          const selected = domain.key === activeDomain;
          return (
            <button
              key={domain.key}
              type="button"
              onClick={() => setActiveDomain(domain.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                selected
                  ? "border-[#4A90E2] bg-[#EFF6FF] text-[#2563EB]"
                  : "border-slate-200 bg-rimvio-surface text-slate-600 hover:border-slate-300",
              )}
            >
              <span className="mr-1">{domain.emoji}</span>
              {domain.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <p className="text-[11px] font-medium text-slate-500">{entry.subtitle}</p>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {mainActions.map((action) => (
            <RimvioActionButton
              key={action.id}
              type="button"
              variant="primary"
              layout="tile"
              fullWidth
              onClick={() => void handleAction(action)}
              iconSlot={
                <span className="text-base leading-none">
                  {String(action.payload?.icon ?? "🎯")}
                </span>
              }
            >
              {action.label}
            </RimvioActionButton>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {auxActions.map((action) => (
            <RimvioActionButton
              key={action.id}
              type="button"
              variant="secondary"
              layout="tile"
              fullWidth
              onClick={() => void handleAction(action)}
              iconSlot={
                <span className="text-base leading-none">
                  {String(action.payload?.icon ?? "✨")}
                </span>
              }
            >
              {action.label}
            </RimvioActionButton>
          ))}
        </div>
      </div>
    </section>
  );
}
