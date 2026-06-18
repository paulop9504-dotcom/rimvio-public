"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import {
  dismissManualFeedBanner,
  shouldShowManualFeedBanner,
} from "@/lib/onboarding/app-manual-onboarding";
import { cn } from "@/lib/utils";

export function RimvioManualFeedBanner({ className }: { className?: string }) {
  const copy = useCopy();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return shouldShowManualFeedBanner();
  });

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "mx-4 flex items-center gap-2 rounded-2xl border border-rimvio-neon-cyan/25 bg-rimvio-neon-cyan/10 px-3 py-2.5",
        className,
      )}
      role="status"
    >
      <BookOpen className="size-4 shrink-0 text-rimvio-neon-cyan" aria-hidden />
      <Link
        href="/welcome?manual=1"
        className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white active:opacity-80"
      >
        {copy.manual.feedBannerText}
        <span className="ml-1 text-rimvio-neon-cyan">{copy.manual.readManualCta} →</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          dismissManualFeedBanner();
          setVisible(false);
        }}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 active:bg-white/10"
        aria-label={copy.manual.dismissBanner}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
