"use client";

import { AuxSeedButton } from "@/components/action-chat/aux-seed-button";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import type { PredictiveDockAction } from "@/lib/predictive-dock/types";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";
import { cn } from "@/lib/utils";

type PredictiveActionDockProps = {
  actions: PredictiveDockAction[];
  onSelect: (action: PredictiveDockAction) => void;
  className?: string;
  /** 검색 탭 등 좁은 영역 — MAIN CTA 축소 */
  compact?: boolean;
};

/** Engine assigns `action_tier` — UI only partitions for layout. */
function layoutDockActions(actions: PredictiveDockAction[]) {
  const main = actions.find((action) => action.action_tier === "MAIN") ?? null;
  const aux = actions.filter((action) => action.id !== main?.id);
  return { main, aux };
}

/** MAIN hero + AUX 알맹이 seeds only. */
export function PredictiveActionDock({
  actions,
  onSelect,
  className,
  compact = false,
}: PredictiveActionDockProps) {
  if (actions.length === 0) {
    return null;
  }

  const { main, aux } = layoutDockActions(actions);

  return (
    <div
      className={cn(compact ? "space-y-1 px-0.5 pb-1 pt-0" : "space-y-2 px-1 pb-2 pt-1", className)}
      aria-label="Action Opportunity"
    >
      {main ? (
        <div className={cn(compact ? "space-y-0.5" : "space-y-1")}>
          <MainActionButton
            label={main.label}
            brand={resolveMainActionBrandStyle({
              id: main.id,
              label: main.label,
              plugin: main.plugin,
              type: main.type,
            })}
            rounded={compact ? "xl" : "2xl"}
            compact={compact}
            icon={<span className={compact ? "text-[15px]" : "text-[18px]"}>{main.icon}</span>}
            onClick={() => onSelect(main)}
          />
          {main.rankingWhy && !compact ? (
            <ActionDockWhyLine line={main.rankingWhy} className="px-1" />
          ) : null}
        </div>
      ) : null}

      {aux.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5 px-0.5"
          aria-label="보조 액션"
        >
          {aux.map((item) => (
            <AuxSeedButton
              key={item.id}
              label={item.label}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
