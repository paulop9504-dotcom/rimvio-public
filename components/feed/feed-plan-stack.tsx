"use client";

import { memo, type ReactNode } from "react";
import type { PlanStackLeg } from "@/lib/plan-context/plan-stack-types";
import { cn } from "@/lib/utils";

const BAND_STYLES = {
  before: {
    row: "border-[#E87040]/35 bg-[#E87040]/10",
    dot: "bg-[#F0946A]",
    label: "text-[#FFD4BC]",
  },
  after: {
    row: "border-[#4A90D9]/35 bg-[#4A90D9]/10",
    dot: "bg-[#6AA8E8]",
    label: "text-[#B8D9FF]",
  },
} as const;

export type FeedPlanStackLegRowProps = {
  leg: PlanStackLeg;
  onPress?: (leg: PlanStackLeg) => void;
};

export const FeedPlanStackLegRow = memo(function FeedPlanStackLegRow({
  leg,
  onPress,
}: FeedPlanStackLegRowProps) {
  const styles = BAND_STYLES[leg.band];
  const interactive = Boolean(onPress && (leg.overlayActionId || leg.deeplink));

  const body = (
    <>
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", styles.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12px] font-semibold leading-snug", styles.label)}>{leg.label}</p>
        {leg.hint ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/42">{leg.hint}</p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left",
    styles.row,
    interactive && "transition-colors hover:bg-white/[0.06] active:scale-[0.99]",
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        data-feed-plan-stack-leg
        data-feed-plan-stack-band={leg.band}
        onClick={() => onPress?.(leg)}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      data-feed-plan-stack-leg
      data-feed-plan-stack-band={leg.band}
    >
      {body}
    </div>
  );
});

export type FeedPlanStackProps = {
  before: readonly PlanStackLeg[];
  after: readonly PlanStackLeg[];
  onLegPress?: (leg: PlanStackLeg) => void;
  children: ReactNode;
  className?: string;
};

export const FeedPlanStack = memo(function FeedPlanStack({
  before,
  after,
  onLegPress,
  children,
  className,
}: FeedPlanStackProps) {
  if (before.length === 0 && after.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-feed-plan-stack>
      {before.length > 0 ? (
        <div className="flex flex-col gap-1" data-feed-plan-stack-before>
          {before.map((leg) => (
            <FeedPlanStackLegRow key={leg.id} leg={leg} onPress={onLegPress} />
          ))}
        </div>
      ) : null}

      <div data-feed-plan-stack-main>{children}</div>

      {after.length > 0 ? (
        <div className="flex flex-col gap-1" data-feed-plan-stack-after>
          {after.map((leg) => (
            <FeedPlanStackLegRow key={leg.id} leg={leg} onPress={onLegPress} />
          ))}
        </div>
      ) : null}
    </div>
  );
});
