"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobeMapProductFocusAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export type GlobeMapProductFocusCardProps = {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  primaryAction: GlobeMapProductFocusAction;
  secondaryAction?: GlobeMapProductFocusAction;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  footer?: ReactNode;
  belowHero?: ReactNode;
  headerExtra?: ReactNode;
  /** sheet = Apple store hero (light panel, edge-to-edge media); card = floating chip. */
  layout?: "sheet" | "card";
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

/** Apple product-page rhythm — headline, pills, hero (no nested photo frame). */
export function GlobeMapProductFocusCard({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  onClose,
  closeAriaLabel,
  hero,
  footer,
  belowHero,
  headerExtra,
  layout = "sheet",
  className,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: GlobeMapProductFocusCardProps) {
  const isSheet = layout === "sheet";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-[#f5f5f7]",
        isSheet
          ? "h-full rounded-t-[1.75rem] shadow-[0_-10px_44px_rgba(0,0,0,0.14)]"
          : "rounded-[1.35rem] shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06]",
        className,
      )}
      data-globe-map-product-focus-card
      data-globe-map-product-focus-layout={layout}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          "relative shrink-0 text-center",
          isSheet ? "px-6 pb-2 pt-5" : "px-3.5 pb-2 pt-4",
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className={cn(
            "absolute z-[2] active:opacity-70",
            isSheet
              ? "right-5 top-3.5 text-[15px] font-normal text-[#0071e3]"
              : "right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-black/[0.06] text-[#1d1d1f]/70",
          )}
          aria-label={closeAriaLabel}
        >
          {isSheet ? "닫기" : <X className="size-3.5" aria-hidden />}
        </button>

        {isSheet ? (
          <div
            className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d2d2d7]"
            aria-hidden
          />
        ) : null}

        {eyebrow ? (
          <p className="mb-1.5 text-[12px] font-medium tracking-wide text-[#86868b]">
            {eyebrow}
          </p>
        ) : null}

        <h2
          className={cn(
            "line-clamp-2 font-semibold tracking-[-0.02em] text-[#1d1d1f]",
            isSheet
              ? "px-2 text-[clamp(1.5rem,6vw,1.75rem)] leading-[1.12]"
              : "px-9 pt-0.5 text-[21px] leading-[1.2]",
          )}
        >
          {title}
        </h2>

        {subtitle ? (
          <p
            className={cn(
              "mx-auto line-clamp-2 font-normal leading-snug text-[#6e6e73]",
              isSheet
                ? "mt-2 max-w-[18rem] text-[15px]"
                : "mt-1.5 px-6 text-[13px] font-medium",
            )}
          >
            {subtitle}
          </p>
        ) : null}

        {headerExtra}

        <div
          className={cn(
            "flex items-center justify-center",
            isSheet ? "mt-5 gap-2.5" : "mt-3 gap-2",
          )}
        >
          <FocusActionButton action={primaryAction} size={isSheet ? "lg" : "md"} />
          {secondaryAction ? (
            <FocusActionButton action={secondaryAction} size={isSheet ? "lg" : "md"} />
          ) : null}
        </div>
      </div>

      <div className={cn("relative shrink-0", isSheet ? "min-h-0 flex-1" : "px-1 pb-1")}>
        {hero}
      </div>

      {footer && !isSheet ? (
        <div className="shrink-0 px-3 pb-2.5 pt-0.5 text-center">{footer}</div>
      ) : null}

      {belowHero ? (
        <div className="shrink-0 border-t border-black/[0.06] bg-[#fbfbfd] px-4 py-2.5">
          {belowHero}
        </div>
      ) : null}

      {footer && isSheet ? (
        <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 text-center">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function FocusActionButton({
  action,
  size,
}: {
  action: GlobeMapProductFocusAction;
  size: "md" | "lg";
}) {
  const primary = action.variant !== "secondary";
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick();
      }}
      className={cn(
        "rounded-full font-normal transition active:scale-[0.98]",
        size === "lg"
          ? "min-w-[6.5rem] px-5 py-2.5 text-[15px]"
          : "min-w-[5.5rem] px-4 py-2 text-[13px] font-semibold",
        primary
          ? "bg-[#0071e3] text-white disabled:bg-[#0071e3]/35"
          : "border border-[#0071e3] bg-transparent text-[#0071e3] disabled:opacity-40",
      )}
    >
      {action.label}
    </button>
  );
}
