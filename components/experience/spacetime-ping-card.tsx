"use client";

import { memo, useMemo } from "react";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import {
  buildSpacetimePingFromMedia,
  buildSpacetimePingNavLinks,
  formatSpacetimePingTimestamp,
  formatSpacetimePingWeatherLines,
  spacetimePingTypeEmoji,
} from "@/lib/experience-graph/build-spacetime-ping";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { useSpacetimePingWeather } from "@/hooks/use-spacetime-ping-weather";
import { cn } from "@/lib/utils";

const MEDIA_EMOJI = {
  photo: "📷",
  video: "🎬",
  text: "✍️",
  other: "🧭",
} as const;

export type SpacetimePingCardProps = {
  item: SpatialMediaItem;
  volume?: ExperienceVolume;
  weather?: WeatherContext | null;
  className?: string;
};

/**
 * Map-overlay ping — time · photo · place pin, with weather + route deeplink on the side.
 */
export const SpacetimePingCard = memo(function SpacetimePingCard({
  item,
  volume,
  weather: weatherProp,
  className,
}: SpacetimePingCardProps) {
  const fetchedWeather = useSpacetimePingWeather({
    location: item.placeLabel,
    capturedAtIso: item.capturedAtIso,
  });
  const weather = weatherProp ?? fetchedWeather;

  const ping = useMemo(
    () => buildSpacetimePingFromMedia({ item, volume, weather }),
    [item, volume, weather],
  );

  const nav = useMemo(() => buildSpacetimePingNavLinks(ping), [ping]);
  const timestamp = formatSpacetimePingTimestamp(ping.capturedAtIso);
  const weatherLines = formatSpacetimePingWeatherLines(ping.weather);
  const typeEmoji = spacetimePingTypeEmoji(ping.eventType);

  const openRoute = () => {
    openSpawnAction({ deeplink: nav.routeDeeplink });
  };

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d14]/92 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
      data-spacetime-ping-card
      data-spacetime-ping-id={ping.id}
    >
      <div className="min-w-0 flex-1 p-3">
        {timestamp ? (
          <p
            className="text-[12px] font-bold tabular-nums text-white/88"
            data-spacetime-ping-time
          >
            {timestamp}
          </p>
        ) : null}

        <div className="mt-2 flex gap-2.5">
          <div
            className="flex size-[72px] shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-900/35 text-center ring-1 ring-white/10"
            data-spacetime-ping-media
          >
            <span className="text-xl" aria-hidden>
              {MEDIA_EMOJI[item.kind]}
            </span>
            <span className="mt-1 line-clamp-2 px-1 text-[9px] font-bold leading-tight text-white/85">
              {ping.title}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
              {ping.title}
            </p>
            {ping.caption ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/55">
                {ping.caption}
              </p>
            ) : null}
            {ping.peerDisplayName ? (
              <p className="mt-1 text-[10px] font-medium text-fuchsia-200/75">
                {ping.peerDisplayName}와 함께
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className="inline-flex size-6 items-center justify-center rounded-full bg-red-500 text-[11px] shadow-[0_0_10px_rgba(239,68,68,0.55)]"
            aria-hidden
          >
            {typeEmoji}
          </span>
          <p className="truncate text-[12px] font-semibold text-white/90">
            {ping.placeLabel}
          </p>
        </div>
      </div>

      <aside
        className="flex w-[108px] shrink-0 flex-col justify-between border-l border-white/10 bg-white/[0.04] p-2.5"
        data-spacetime-ping-context
      >
        <div>
          <p className="text-[10px] font-medium text-white/40">그때 날씨</p>
          <p className="mt-1 flex items-center gap-1 text-[15px] font-bold tabular-nums text-sky-100">
            <span aria-hidden>{weatherLines.emoji}</span>
            {weatherLines.primary}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold leading-snug text-white/55">
            {weatherLines.secondary}
          </p>
        </div>

        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-sky-500/20 px-2 py-2 text-[10px] font-bold text-sky-100 ring-1 ring-sky-400/30 transition-colors hover:bg-sky-500/30 active:scale-[0.98]"
          data-spacetime-ping-nav
          onClick={openRoute}
        >
          🚗 가는 길
        </button>
      </aside>
    </div>
  );
});
