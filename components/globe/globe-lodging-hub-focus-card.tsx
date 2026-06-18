"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { GlobeMapProductFocusAction } from "@/components/globe/globe-map-product-focus-card";
import type { LodgingDynamicTags } from "@/lib/globe/lodging/lodging-dynamic-tag-types";
import { cn } from "@/lib/utils";

export type GlobeLodgingHubFocusCardProps = {
  title: string;
  priceLine?: string | null;
  placeLabel?: string | null;
  situationalLabel?: string | null;
  dynamicTags?: LodgingDynamicTags | null;
  primaryAction: GlobeMapProductFocusAction;
  secondaryAction: GlobeMapProductFocusAction;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  footer?: ReactNode;
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

function pickTransitPills(tags: LodgingDynamicTags | null | undefined): {
  lead: string | null;
  trail: string | null;
} {
  if (!tags?.chips.length) {
    return { lead: null, trail: null };
  }
  const taxi = tags.chips.find((chip) => chip.id.includes("taxi"))?.label ?? null;
  const walk = tags.chips.find((chip) => chip.id.includes("walk"))?.label ?? null;
  if (taxi && walk) {
    return { lead: taxi, trail: walk };
  }
  if (tags.chips.length === 1) {
    return { lead: tags.chips[0]!.label, trail: null };
  }
  return { lead: tags.chips[0]?.label ?? null, trail: tags.chips[1]?.label ?? null };
}

/** Lodging hub focus — hero-first with situational pills from dynamic tags. */
export function GlobeLodgingHubFocusCard({
  title,
  priceLine,
  placeLabel,
  situationalLabel,
  dynamicTags,
  primaryAction,
  secondaryAction,
  onClose,
  closeAriaLabel,
  hero,
  footer,
  className,
  onTouchStart,
  onTouchEnd,
}: GlobeLodgingHubFocusCardProps) {
  const { lead: transitLead, trail: transitTrail } = pickTransitPills(dynamicTags);
  const contextLine = dynamicTags?.contextLine?.trim() || null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.15rem] bg-[#f5f5f7] shadow-[0_16px_40px_rgba(0,0,0,0.26)] ring-1 ring-white/15",
        className,
      )}
      data-globe-lodging-hub-focus-card
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative">
        <div className="relative overflow-hidden bg-[#141416]">{hero}</div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-1.5 top-1.5 z-[4] flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
          aria-label={closeAriaLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>

        {transitLead || transitTrail ? (
          <div className="pointer-events-none absolute inset-x-1.5 top-1.5 z-[3] flex items-start justify-between gap-1.5 pr-8">
            {transitLead ? (
              <span className="max-w-[48%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                {transitLead}
              </span>
            ) : (
              <span aria-hidden />
            )}
            {transitTrail ? (
              <span className="max-w-[48%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                {transitTrail}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2 pt-10">
          <h2 className="line-clamp-2 text-[17px] font-bold leading-tight tracking-tight text-white">
            {title}
          </h2>
          {priceLine ? (
            <p className="mt-0.5 text-[12px] font-medium text-white/90">{priceLine}</p>
          ) : null}
          {placeLabel ? (
            <p className="mt-0.5 text-[11px] font-medium text-white/75">{placeLabel}</p>
          ) : null}
        </div>

        {situationalLabel ? (
          <div className="pointer-events-none absolute inset-x-0 -bottom-3 z-[5] flex justify-center">
            <span className="rounded-full border border-black/[0.06] bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#1d1d1f] shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
              {situationalLabel}
            </span>
          </div>
        ) : null}
      </div>

      {contextLine ? (
        <div className="relative z-[1] px-2 pt-4">
          <p className="rounded-[0.85rem] bg-black/55 px-2.5 py-2 text-[12px] font-medium leading-snug text-white/95 backdrop-blur-md">
            {contextLine}
          </p>
        </div>
      ) : (
        <div className={cn(situationalLabel ? "pt-1.5" : "pt-0")} aria-hidden />
      )}

      <div className="flex items-center justify-center gap-1.5 px-2.5 pb-2.5 pt-2">
        <HubFocusAction action={primaryAction} />
        <HubFocusAction action={secondaryAction} variant="secondary" />
      </div>

      {footer ? (
        <div className="border-t border-black/[0.06] px-2.5 py-1.5 text-center">{footer}</div>
      ) : null}
    </article>
  );
}

function HubFocusAction({
  action,
  variant = "primary",
}: {
  action: GlobeMapProductFocusAction;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick();
      }}
      className={cn(
        "min-w-[5rem] rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]",
        primary
          ? "bg-[#0071e3] text-white disabled:bg-[#0071e3]/35"
          : "border border-[#0071e3] bg-white text-[#0071e3] disabled:opacity-40",
      )}
    >
      {action.label}
    </button>
  );
}
