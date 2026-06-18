"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import {
  hasSeenManualIntro,
  markManualIntroSeen,
} from "@/lib/onboarding/app-manual-onboarding";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

export function RimvioManualIntroSheet() {
  const copy = useCopy();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenManualIntro()) {
      const timer = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const close = () => {
    markManualIntroSeen();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="manual-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal
          aria-labelledby="manual-intro-title"
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={cn("w-full max-w-md space-y-4 p-5", IOS.card)}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rimvio-neon-cyan/15 text-rimvio-neon-cyan">
                <BookOpen className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rimvio-neon-cyan">
                  {copy.manual.eyebrow}
                </p>
                <h2
                  id="manual-intro-title"
                  className="mt-1 text-lg font-semibold text-white"
                >
                  {copy.manual.introTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {copy.manual.introBody}
                </p>
              </div>
            </div>

            <ol className="space-y-2 rounded-2xl bg-rimvio-surface-muted/80 px-3 py-3 text-[12px] text-white/70">
              <li>① {copy.manual.step1Title}</li>
              <li>② {copy.manual.step2Title}</li>
              <li>③ {copy.manual.step3Title}</li>
            </ol>

            <div className="flex flex-col gap-2">
              <Link
                href="/welcome?manual=1"
                onClick={close}
                className={cn("w-full text-center", IOS.primaryBtn)}
              >
                {copy.manual.readManualCta}
              </Link>
              <button
                type="button"
                onClick={close}
                className={cn("w-full py-3 text-center text-[15px] font-semibold", IOS.secondaryBtn)}
              >
                {copy.manual.skipIntroCta}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
