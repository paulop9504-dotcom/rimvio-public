"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import {
  MAP_APP_OPTIONS,
  MAP_APP_UPDATED,
  orderedMapAppOptions,
  readMapApp,
  writeMapApp,
  type MapApp,
} from "@/lib/preferences/map-app";
import type { MapLaunchContext } from "@/lib/resolvers/map-app-launch";
import { cn } from "@/lib/utils";

type MapAppSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: MapLaunchContext | null;
  placeLabel?: string | null;
  onSelect: (app: MapApp) => void;
};

export function MapAppSheet({
  open,
  onOpenChange,
  context,
  placeLabel,
  onSelect,
}: MapAppSheetProps) {
  const copy = useCopy();
  const [defaultApp, setDefaultApp] = useState<MapApp>("naver");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !context) {
      return;
    }

    setDefaultApp(readMapApp(context.domestic));

    const onUpdate = () => {
      if (context) {
        setDefaultApp(readMapApp(context.domestic));
      }
    };
    window.addEventListener(MAP_APP_UPDATED, onUpdate);
    return () => window.removeEventListener(MAP_APP_UPDATED, onUpdate);
  }, [context, open]);

  if (!mounted || !context) {
    return null;
  }

  const options = orderedMapAppOptions(context.domestic);
  const place = placeLabel?.trim() || context.query;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="?�기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-app-sheet-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg",
              "rounded-t-[28px] bg-[#FAFAFC] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3",
              "shadow-[0_-18px_48px_-24px_rgba(0,0,0,0.35)] ring-1 ring-rimvio-neon-purple/15"
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="map-app-sheet-title"
                  className="text-[15px] font-semibold tracking-tight"
                >
                  {copy.settings.mapSheetTitle}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  {copy.settings.mapSheetHint(place.slice(0, 24))}
                </p>
              </div>
              <button
                type="button"
                aria-label="?�기"
                onClick={() => onOpenChange(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rimvio-surface-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {options.map((option) => {
                const meta = MAP_APP_OPTIONS.find((item) => item.id === option.id);
                const isDefault = defaultApp === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      writeMapApp(option.id);
                      onSelect(option.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                      isDefault
                        ? "bg-rimvio-neon-purple/8 ring-2 ring-[#007AFF]/30"
                        : "bg-rimvio-surface ring-1 ring-rimvio-neon-purple/15"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                        isDefault
                          ? "bg-rimvio-neon-purple text-white"
                          : "bg-rimvio-surface-muted text-foreground"
                      )}
                      aria-hidden
                    >
                      {isDefault ? (
                        <Check className="size-5" strokeWidth={2.5} />
                      ) : (
                        <MapPin className="size-5" strokeWidth={2} />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {option.emoji} {option.label}
                        </span>
                        {isDefault ? (
                          <span className="rounded-full bg-rimvio-neon-purple/10 px-2 py-0.5 text-[10px] font-semibold text-rimvio-neon-cyan">
                            {copy.settings.mapBadge}
                          </span>
                        ) : null}
                        {meta?.badge && !isDefault ? (
                          <span className="rounded-full bg-[#FF9500]/12 px-2 py-0.5 text-[10px] font-semibold text-[#C93400]">
                            {meta.badge}
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

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              {copy.settings.mapSheetFootnote}
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
