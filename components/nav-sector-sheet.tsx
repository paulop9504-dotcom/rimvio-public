"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import {
  resolveMainActionBrandStyle,
} from "@/lib/brand/action-brand-style";
import { GoogleBrandText, isGoogleBrandText } from "@/lib/brand/google-brand-text";
import { rimvioIconBtnClass } from "@/lib/brand/rimvio-neon-theme";
import {
  buildNavSectorOptions,
  hideNavSectorProvider,
  NAV_SECTOR_UPDATED,
  navSectorUsageCount,
  type NavSectorDestination,
  type NavSectorOption,
} from "@/lib/navigation/nav-sector";
import { cn } from "@/lib/utils";

type NavSectorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: NavSectorDestination | null;
  placeLabel?: string | null;
  onSelect: (option: NavSectorOption) => void;
};

type NavSectorOptionRowProps = {
  option: NavSectorOption;
  isTopPick: boolean;
  frequentBadge: string;
  hideLabel: string;
  onSelect: () => void;
  onHide: () => void;
};

function NavSectorOptionRow({
  option,
  isTopPick,
  frequentBadge,
  hideLabel,
  onSelect,
  onHide,
}: NavSectorOptionRowProps) {
  const brand = resolveMainActionBrandStyle({
    id: option.id,
    label: option.label,
    href: option.href,
  });
  const googleLabel = isGoogleBrandText({
    id: option.id,
    label: option.label,
    href: option.href,
  });

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        className="rimvio-action-shell-btn flex min-w-0 flex-1 items-center rounded-2xl border bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99]"
        style={{
          borderColor: brand.borderColor,
          backgroundColor: brand.fillColor,
        }}
        onClick={onSelect}
      >
        <span className="min-w-0 flex-1">
          {googleLabel ? (
            <GoogleBrandText
              text={option.label}
              className="block text-[15px] font-semibold leading-tight tracking-[-0.01em]"
            />
          ) : (
            <span
              className="block truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]"
              style={{ color: brand.textColor }}
            >
              {option.label}
            </span>
          )}
          <span className="mt-0.5 block truncate text-[11px] leading-snug text-white/55">
            {option.hint}
          </span>
        </span>

        {isTopPick ? (
          <span className="shrink-0 rounded-full border border-white/35 px-2 py-0.5 text-[10px] font-semibold text-white/70">
            {frequentBadge}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        aria-label={`${option.label} ${hideLabel}`}
        className="rimvio-action-shell-chip shrink-0 self-center rounded-full border border-white/85 bg-transparent px-3 py-2 text-[11px] font-semibold text-white/75 transition-colors hover:bg-white/[0.06] active:scale-[0.98]"
        onClick={onHide}
      >
        {hideLabel}
      </button>
    </div>
  );
}

export function NavSectorSheet({
  open,
  onOpenChange,
  destination,
  placeLabel,
  onSelect,
}: NavSectorSheetProps) {
  const copy = useCopy();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onUpdate = () => setRefreshKey((value) => value + 1);
    window.addEventListener(NAV_SECTOR_UPDATED, onUpdate);
    return () => window.removeEventListener(NAV_SECTOR_UPDATED, onUpdate);
  }, [open]);

  const options = useMemo(() => {
    if (!destination) {
      return [];
    }

    void refreshKey;
    return buildNavSectorOptions(destination);
  }, [destination, refreshKey]);

  if (!mounted || !destination) {
    return null;
  }

  const place = placeLabel?.trim() || destination.placeName?.trim() || destination.query;
  const topUsage = Math.max(...options.map((option) => navSectorUsageCount(option.id)), 0);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[3px]"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-sector-sheet-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "nav-sector-sheet fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg",
              "rounded-t-[28px] border border-white/[0.08] bg-rimvio-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3",
              "shadow-[0_-18px_48px_-24px_rgba(0,0,0,0.55)]",
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="nav-sector-sheet-title"
                  className="text-[15px] font-semibold tracking-tight text-white"
                >
                  {copy.settings.navSectorTitle}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-white/55">
                  {copy.settings.navSectorHint(place.slice(0, 28))}
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => onOpenChange(false)}
                className={rimvioIconBtnClass("secondary", "sm")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto">
              {options.map((option) => {
                const usage = navSectorUsageCount(option.id);
                const isTopPick = usage > 0 && usage === topUsage;

                return (
                  <NavSectorOptionRow
                    key={option.id}
                    option={option}
                    isTopPick={isTopPick}
                    frequentBadge={copy.settings.navSectorFrequentBadge}
                    hideLabel={copy.settings.navSectorHide}
                    onSelect={() => {
                      onSelect(option);
                      onOpenChange(false);
                    }}
                    onHide={() => hideNavSectorProvider(option.id)}
                  />
                );
              })}
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">
              {copy.settings.navSectorFootnote}
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
