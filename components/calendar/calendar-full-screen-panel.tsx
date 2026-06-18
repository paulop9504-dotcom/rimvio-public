"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { CalendarGoogleConnectBanner } from "@/components/calendar/calendar-google-connect-banner";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import { useCopy } from "@/hooks/use-copy";

type CalendarFullScreenPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  onAddSchedule?: () => void;
  onSpawnPrompt?: (uri: string) => void;
};

/** Search-tab full calendar — same surface as former /calendar tab, no bottom-nav duplicate. */
export function CalendarFullScreenPanel({
  open,
  onOpenChange,
  overlayRows,
  onAddSchedule,
  onSpawnPrompt,
}: CalendarFullScreenPanelProps) {
  const copy = useCopy();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[88] bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={copy.nav.calendar}
            className="fixed inset-0 z-[89] flex flex-col bg-rimvio-base text-foreground"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-rimvio-base px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="text-[15px] font-semibold text-foreground">
                {copy.nav.calendar}
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <CalendarToolbar
                variant="page"
                className="mb-3 shrink-0"
                showFullScreenLink={false}
                oauthSurface="full"
              />

              <CalendarGoogleConnectBanner className="mb-3 shrink-0" oauthSurface="full" />

              <CalendarBoard
                variant="full"
                defaultView="month"
                overlayRows={overlayRows}
                hideOriginLegend
                showEmptyActions
                className="min-h-0 flex-1 rounded-2xl"
                onAddSchedule={onAddSchedule}
                onSpawnPrompt={onSpawnPrompt}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
