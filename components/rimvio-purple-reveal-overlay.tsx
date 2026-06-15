"use client";

import { useEffect } from "react";
import { RimvioAvatarMark } from "@/lib/brand/rimvio-smiley-mark";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioPurpleRevealOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function RimvioPurpleRevealOverlay({
  open,
  onClose,
}: RimvioPurpleRevealOverlayProps) {
  const copy = useCopy();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(onClose, 4200);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={copy.settings.drawPurpleRevealTitle}
      data-testid="rimvio-purple-reveal"
    >
      <button
        type="button"
        aria-label={copy.common.close}
        className="absolute inset-0 bg-[#12061f]/88 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-sm flex-col items-center text-center",
          "animate-rimvio-purple-reveal-in"
        )}
      >
        <div className="pointer-events-none absolute -inset-8 rounded-full bg-violet-500/25 blur-3xl animate-rimvio-draw-glow" />

        <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200/90">
          {copy.settings.drawPurpleRevealEyebrow}
        </p>

        <div className="relative mt-4 flex size-36 items-center justify-center rounded-[2rem] bg-rimvio-surface shadow-2xl ring-4 ring-violet-300/50 animate-rimvio-draw-pop">
          <span
            className="pointer-events-none absolute -inset-3 rounded-[2.4rem] bg-gradient-to-br from-violet-400/30 via-fuchsia-300/20 to-amber-200/20 animate-ping"
            aria-hidden
          />
          <RimvioAvatarMark variant="purple" pixels={112} crisp />
        </div>

        <h2 className="relative mt-6 text-2xl font-bold tracking-tight text-white">
          {copy.settings.drawPurpleRevealTitle}
        </h2>
        <p className="relative mt-2 text-sm leading-relaxed text-violet-100/90">
          {copy.settings.drawPurpleRevealBody}
        </p>
        <p className="relative mt-3 text-xs font-semibold text-amber-200/95">
          {copy.settings.drawPurpleRevealOdds}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="relative mt-8 rounded-full bg-rimvio-surface px-5 py-2.5 text-sm font-bold text-violet-700 shadow-lg active:scale-[0.98]"
        >
          {copy.settings.drawPurpleRevealDismiss}
        </button>
      </div>
    </div>
  );
}
