"use client";

import {
  commerceVerdictAccentClass,
  commerceVerdictBarClass,
  formatCommerceHeroMetric,
  type CommerceVerdictPresentation,
} from "@/lib/commerce/commerce-verdict-presentation";
import { useCommerceVerdictReveal } from "@/hooks/use-commerce-verdict-reveal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

function formatAnimatedHero(
  presentation: CommerceVerdictPresentation,
  animatedValue: number
) {
  const { heroMetric, kind } = presentation;

  if (kind === "pending") {
    return "—";
  }

  if (heroMetric.unit === "none" && heroMetric.amount === null) {
    return "적정";
  }

  if (heroMetric.unit === "won_per_period") {
    const months = heroMetric.periodMonths ?? 6;
    return `${animatedValue.toLocaleString("ko-KR")}원/${months}mo`;
  }

  const signed = heroMetric.signed === "~" ? "" : heroMetric.signed;
  return `${signed}${animatedValue.toLocaleString("ko-KR")}원`;
}

type CommerceVerdictHeaderProps = {
  presentation: CommerceVerdictPresentation;
  revealKey: string;
  active?: boolean;
  compact?: boolean;
};

export function CommerceVerdictHeader({
  presentation,
  revealKey,
  active = true,
  compact = false,
}: CommerceVerdictHeaderProps) {
  const reducedMotion = useReducedMotion();
  const targetHeroAmount = presentation.heroMetric.amount ?? 0;
  const { stampVisible, heroValue, spectrumPosition } =
    useCommerceVerdictReveal({
      active,
      revealKey,
      kind: presentation.kind,
      targetHeroAmount,
      targetSpectrumPosition: presentation.spectrumPosition,
      reducedMotion,
    });

  const showStamp = presentation.kind !== "pending" && stampVisible;
  const showSpectrum = presentation.kind !== "pending";
  const accentText = commerceVerdictAccentClass(presentation.accent);
  const accentBar = commerceVerdictBarClass(presentation.accent);
  const staticHero = formatCommerceHeroMetric(presentation.heroMetric);
  const animatedHero = formatAnimatedHero(presentation, heroValue);

  return (
    <div className="relative pl-3">
      <div
        aria-hidden
        className={cn(
          "absolute bottom-0 left-0 top-0 w-[3px] rounded-full",
          accentBar
        )}
      />

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
          중고 영수증
        </p>

        {presentation.kind === "pending" ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            PENDING
          </p>
        ) : showStamp ? (
          <p
            className={cn(
              "mt-1 origin-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-[transform,opacity] duration-300 ease-out",
              accentText,
              presentation.isEstimated && "opacity-90",
              reducedMotion
                ? "opacity-100"
                : stampVisible
                  ? "-rotate-[8deg] scale-100 opacity-100"
                  : "scale-90 opacity-0"
            )}
          >
            {presentation.stampLabel}
          </p>
        ) : (
          <p className="mt-1 h-[14px]" aria-hidden />
        )}

        <p className="mt-1 text-[12px] font-semibold leading-snug text-foreground">
          {presentation.verdictHeadline}
        </p>

        <p
          className={cn(
            "mt-1 font-semibold tabular-nums tracking-tight text-foreground",
            compact ? "text-[22px]" : "text-[28px] leading-none",
            presentation.kind !== "pending" &&
              presentation.heroMetric.signed === "+" &&
              "text-rose-600",
            presentation.kind !== "pending" &&
              presentation.heroMetric.signed === "-" &&
              "text-rimvio-neon-cyan"
          )}
        >
          {reducedMotion || presentation.kind === "pending"
            ? staticHero
            : animatedHero}
        </p>

        {showSpectrum ? (
          <div className="mt-2.5">
            <div className="relative h-1 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className={cn(
                  "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-[left] duration-500 ease-out",
                  accentBar
                )}
                style={{ left: `${spectrumPosition}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/70">
              <span>저렴</span>
              <span>비쌈</span>
            </div>
          </div>
        ) : null}

        <p className="mt-2 text-[10px] leading-snug text-muted-foreground/85">
          {presentation.subline}
        </p>
      </div>
    </div>
  );
}
