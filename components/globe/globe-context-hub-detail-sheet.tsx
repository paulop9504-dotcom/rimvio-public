"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import type { GlobeContextHubRailProps } from "@/components/globe/globe-context-hub-rail";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubDetailSheetProps = Omit<
  GlobeContextHubRailProps,
  "layout" | "presentation" | "defaultExpanded" | "onDismiss"
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

/**
 * Full-screen Hub detail — map anchor opens this, not PinOpenSheet.
 * @see docs/GLOBE_HUB_RESOURCE.md · Context map flow
 */
export function GlobeContextHubDetailSheet({
  open,
  onOpenChange,
  className,
  ...railProps
}: GlobeContextHubDetailSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-[70] flex flex-col bg-background",
            className,
          )}
          data-globe-context-hub-detail
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-border/50 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                {copy.globe.contextHubEyebrow}
              </p>
              <h1 className="text-[18px] font-semibold leading-tight text-foreground">
                {copy.globe.contextHubDetailTitle}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {copy.globe.contextHubDetailBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/70 active:bg-muted"
              aria-label={copy.globe.contextHubDetailCloseAria}
            >
              <X className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <GlobeContextHubRail
              {...railProps}
              visible
              layout="hero"
              presentation="detail"
              defaultExpanded
              onDismiss={() => onOpenChange(false)}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
