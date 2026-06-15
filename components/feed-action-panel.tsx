"use client";

import { Loader2 } from "lucide-react";
import { RimvioActionButton } from "@/components/ui/rimvio-action-button";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import type { AppLocale } from "@/lib/i18n/types";
import type { LinkActionItem } from "@/types/database";
import { cn } from "@/lib/utils";
import { HorizontalScrollRail } from "@/components/horizontal-scroll-rail";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";

type FeedActionPanelProps = {
  signalLine?: string | null;
  title?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondary?: LinkActionItem[];
  onSecondary?: (action: LinkActionItem) => void;
  locale: AppLocale;
  primaryVariant?: "default" | "youtube";
  showPrimary?: boolean;
  loading?: boolean;
  className?: string;
  /** stack = no card chrome · overlay = on photo (glass pills) */
  variant?: "card" | "stack" | "overlay";
  /** Deterministic MAIN ranking hint (causal / rollup). */
  rankingWhy?: string | null;
};

export function FeedActionPanel({
  signalLine,
  title,
  primaryLabel,
  onPrimary,
  secondary = [],
  onSecondary,
  locale,
  primaryVariant = "default",
  showPrimary = true,
  loading = false,
  className,
  variant = "stack",
  rankingWhy = null,
}: FeedActionPanelProps) {
  const showTitle =
    Boolean(title?.trim()) &&
    title?.trim().toLowerCase() !== signalLine?.trim().toLowerCase();

  const isOverlay = variant === "overlay";
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        isCard &&
          "overflow-hidden rounded-[20px] border border-border bg-[#FAFAFC] ring-1 ring-black/[0.03]",
        !isCard && !isOverlay && "space-y-2.5",
        isOverlay && "space-y-2.5",
        className
      )}
    >
      <div className={cn(isCard && "space-y-2.5 px-3.5 py-3.5")}>
        {signalLine ? (
          <p
            className={cn(
              "text-[12px] font-medium leading-snug",
              isOverlay ? "text-white/88" : "text-[#636366]"
            )}
          >
            {signalLine}
          </p>
        ) : null}

        {showTitle ? (
          <p
            className={cn(
              "text-[15px] font-semibold leading-snug tracking-tight",
              isOverlay ? "text-white" : "text-foreground"
            )}
          >
            {title}
          </p>
        ) : null}

        {loading ? (
          <div
            className={cn(
              "mx-auto flex w-[var(--golden-major)] max-w-full items-center justify-center gap-2",
              "rounded-[var(--space-phi)] px-[var(--space-phi2)] py-[var(--space-phi)] text-[14px] font-medium",
              isOverlay
                ? "bg-rimvio-surface/15 text-white backdrop-blur-md"
                : "bg-rimvio-neon-purple/10 text-rimvio-neon-cyan"
            )}
          >
            <Loader2 className="size-4 animate-spin" />
            찾는 중…
          </div>
        ) : showPrimary ? (
          <>
            <RimvioActionButton
              type="button"
              onClick={onPrimary}
              fullWidth
              className={cn(
                "mx-auto w-[var(--golden-major)] max-w-full",
                primaryVariant === "youtube" &&
                  "!border-[#ff0033]/20 !bg-[#ff0033] hover:!bg-[#e6002e] active:!bg-[#e6002e]"
              )}
            >
              {primaryLabel}
            </RimvioActionButton>
            {rankingWhy ? (
              <ActionDockWhyLine
                line={rankingWhy}
                variant={isOverlay ? "overlay" : "default"}
                className="mt-1.5 px-1"
              />
            ) : null}
          </>
        ) : null}

        {secondary.length > 0 && onSecondary ? (
          <HorizontalScrollRail
            fadeFrom={isOverlay ? "rgba(0,0,0,0.55)" : "#FAFAFC"}
            showHint={false}
            scrollClassName="gap-2 pb-0.5"
          >
            {secondary.map((action) => (
              <RimvioActionButton
                key={action.id}
                type="button"
                variant="secondary"
                layout="pill"
                onClick={() => onSecondary(action)}
                className={cn(
                  "shrink-0",
                  isOverlay &&
                    "!border-white/25 !bg-rimvio-surface/18 !text-white !shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
                )}
              >
                {cleanFeedActionLabel(action.label, locale)}
              </RimvioActionButton>
            ))}
          </HorizontalScrollRail>
        ) : null}
      </div>
    </div>
  );
}
