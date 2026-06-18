"use client";

import { memo } from "react";
import { weatherPrepEmoji } from "@/lib/plan-context/weather-prep-visual";
import type { WeatherCondition } from "@/lib/context-resolver/types";
import { cn } from "@/lib/utils";

export type FeedWeatherPrepStripProps = {
  prepLine: string;
  condition?: WeatherCondition;
  leadingEmoji?: string;
  className?: string;
};

/** Actionable weather prep — separate from place/peer context so it stays readable. */
export const FeedWeatherPrepStrip = memo(function FeedWeatherPrepStrip({
  prepLine,
  condition = "unknown",
  leadingEmoji,
  className,
}: FeedWeatherPrepStripProps) {
  const emoji = leadingEmoji ?? weatherPrepEmoji(condition);
  const isWeather = leadingEmoji == null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-2.5 py-2",
        isWeather
          ? "border-amber-400/30 bg-amber-500/[0.08]"
          : "border-fuchsia-400/25 bg-fuchsia-500/[0.07]",
        className,
      )}
      data-feed-weather-prep={isWeather ? "true" : undefined}
      data-feed-type-prep={isWeather ? undefined : "true"}
      data-feed-weather-condition={isWeather ? condition : undefined}
    >
      <span className="mt-px text-[15px] leading-none" aria-hidden>
        {emoji}
      </span>
      <p
        className={cn(
          "min-w-0 flex-1 text-[11px] font-semibold leading-snug",
          isWeather ? "text-amber-50/92" : "text-fuchsia-50/92",
        )}
      >
        {prepLine}
      </p>
    </div>
  );
});
