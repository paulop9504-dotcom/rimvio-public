"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type SearchExperienceRunBannerProps = {
  headline: string | null;
  featureLabel: string;
  className?: string;
};

export function SearchExperienceRunBanner({
  headline,
  featureLabel,
  className,
}: SearchExperienceRunBannerProps) {
  const copy = useCopy();

  return (
    <div
      className={cn(
        "mx-4 mb-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3",
        className,
      )}
      data-search-experience-run-banner
    >
      <div className="flex items-start gap-2">
        <Link
          href="/feed"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/15"
          aria-label={copy.search.run.backToFeed}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/55">
            {copy.search.run.eyebrow}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-white">
            {headline ?? copy.search.run.fallbackTitle}
          </p>
          <p className="mt-1 text-[12px] text-white/50">
            {copy.search.run.contextLine(featureLabel)}
          </p>
        </div>
      </div>
    </div>
  );
}
