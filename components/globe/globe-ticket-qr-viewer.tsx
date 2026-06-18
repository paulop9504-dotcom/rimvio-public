"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTicketScanSurface } from "@/hooks/use-ticket-scan-surface";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeTicketQrViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrSrc: string | null;
  title?: string | null;
  subtitle?: string | null;
};

/** Full-screen QR — wake lock + high-luminance surface for gate scanners. */
export function GlobeTicketQrViewer({
  open,
  onOpenChange,
  qrSrc,
  title = null,
  subtitle = null,
}: GlobeTicketQrViewerProps) {
  const [mounted, setMounted] = useState(false);
  useTicketScanSurface(open && Boolean(qrSrc));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && qrSrc ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col bg-white text-black"
          data-globe-ticket-qr-viewer
          role="dialog"
          aria-modal="true"
          aria-label={title ?? copy.globe.ticketQrViewerTitle}
        >
          <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {copy.globe.ticketQrViewerEyebrow}
              </p>
              {title ? (
                <p className="truncate text-[16px] font-semibold text-neutral-900">{title}</p>
              ) : null}
              {subtitle ? (
                <p className="truncate text-[12px] text-neutral-600">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 active:bg-neutral-200"
              aria-label={copy.globe.ticketQrViewerClose}
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div
              className={cn(
                "w-full max-w-[min(92vw,22rem)] rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm",
                "rimvio-ticket-qr-card",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt=""
                className="mx-auto block max-h-[min(58vh,24rem)] w-full object-contain"
                draggable={false}
              />
            </div>
            <p className="mt-4 text-center text-[12px] font-medium text-neutral-600">
              {copy.globe.ticketQrViewerHint}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
