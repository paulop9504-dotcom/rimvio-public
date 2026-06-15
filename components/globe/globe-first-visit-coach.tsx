"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Hand,
  ImagePlus,
  Layers,
} from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import {
  hasSeenGlobeGuide,
  markGlobeGuideSeen,
} from "@/lib/onboarding/globe-first-visit-onboarding";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icon: Globe2,
    tone: "text-primary",
    bg: "bg-primary/12",
    title: () => copy.globe.guide.step1Title,
    body: () => copy.globe.guide.step1Body,
  },
  {
    icon: ImagePlus,
    tone: "text-emerald-600",
    bg: "bg-emerald-500/12",
    title: () => copy.globe.guide.step2Title,
    body: () => copy.globe.guide.step2Body,
  },
  {
    icon: Hand,
    tone: "text-sky-600",
    bg: "bg-sky-500/12",
    title: () => copy.globe.guide.step3Title,
    body: () => copy.globe.guide.step3Body,
  },
  {
    icon: Layers,
    tone: "text-violet-600",
    bg: "bg-violet-500/12",
    title: () => copy.globe.guide.step4Title,
    body: () => copy.globe.guide.step4Body,
  },
] as const;

export type GlobeFirstVisitCoachProps = {
  /** Controlled open — settings "다시 보기" */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAddPhoto?: () => void;
};

export function GlobeFirstVisitCoach({
  open: openProp,
  onOpenChange,
  onAddPhoto,
}: GlobeFirstVisitCoachProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  useEffect(() => {
    if (controlled) {
      return;
    }
    if (!hasSeenGlobeGuide()) {
      const timer = window.setTimeout(() => setInternalOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
  }, [controlled]);

  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  const close = () => {
    markGlobeGuideSeen();
    setOpen(false);
  };

  const onPrimary = () => {
    markGlobeGuideSeen();
    setOpen(false);
    onAddPhoto?.();
  };

  const slide = SLIDES[step]!;
  const Icon = slide.icon;
  const isLast = step >= SLIDES.length - 1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="globe-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal
          aria-labelledby="globe-guide-title"
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-card shadow-2xl ring-1 ring-border/60"
          >
            <div className="border-b border-border/50 px-5 pb-4 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {copy.globe.guide.eyebrow}
              </p>
              <h2
                id="globe-guide-title"
                className="mt-1 text-[22px] font-semibold tracking-tight text-foreground"
              >
                {copy.globe.guide.title}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {copy.globe.guide.subtitle}
              </p>
            </div>

            <div className="px-5 py-6">
              <div className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    "mb-4 flex size-16 items-center justify-center rounded-[22px]",
                    slide.bg,
                    slide.tone,
                  )}
                >
                  <Icon className="size-8" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-[17px] font-semibold text-foreground">
                  {slide.title()}
                </p>
                <p className="mt-2 max-w-[18rem] text-[15px] leading-relaxed text-muted-foreground">
                  {slide.body()}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5">
                {SLIDES.map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      index === step
                        ? "w-5 bg-primary"
                        : "w-1.5 bg-muted-foreground/25",
                    )}
                    aria-hidden
                  />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30"
                  aria-label="이전"
                >
                  <ChevronLeft className="size-5" />
                </button>
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep((value) => Math.min(SLIDES.length - 1, value + 1))
                    }
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-[14px] bg-primary py-3.5 text-[16px] font-semibold text-primary-foreground active:scale-[0.98]"
                  >
                    다음
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPrimary}
                    className="inline-flex flex-1 items-center justify-center rounded-[14px] bg-primary py-3.5 text-[16px] font-semibold text-primary-foreground active:scale-[0.98]"
                  >
                    {copy.globe.guide.primaryCta}
                  </button>
                )}
                <button
                  type="button"
                  disabled={step >= SLIDES.length - 1}
                  onClick={() =>
                    setStep((value) => Math.min(SLIDES.length - 1, value + 1))
                  }
                  className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30"
                  aria-label="다음"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/50 px-5 py-4">
              {isLast ? (
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2.5 text-[15px] font-medium text-muted-foreground active:opacity-70"
                >
                  {copy.globe.guide.secondaryCta}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2.5 text-[15px] font-medium text-muted-foreground active:opacity-70"
                >
                  {copy.globe.guide.secondaryCta}
                </button>
              )}
              <Link
                href="/welcome?manual=1"
                onClick={close}
                className="text-center text-[13px] font-medium text-primary"
              >
                {copy.globe.guide.detailLink}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
