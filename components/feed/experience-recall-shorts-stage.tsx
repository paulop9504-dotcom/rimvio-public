"use client";

import { memo, useEffect, useRef, useState } from "react";
import { buildExperienceRecallCaption } from "@/lib/feed/build-experience-recall-caption";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import {
  parseUploadMediaContextId,
} from "@/lib/location-ping/media-blob-store";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

const PLACEHOLDER_GRADIENT: Record<SpatialMediaItem["season"], string> = {
  spring: "from-emerald-400/30 via-teal-900/50 to-slate-950",
  summer: "from-amber-400/35 via-orange-900/45 to-slate-950",
  autumn: "from-orange-400/30 via-rose-900/45 to-slate-950",
  winter: "from-sky-300/25 via-indigo-950/55 to-slate-950",
};

export type ExperienceRecallShortsStageProps = {
  item?: SpatialMediaItem | null;
  volume?: ExperienceVolume | null;
  pin?: ClassifiedGlobePin | null;
  className?: string;
};

/** Insta / Shorts-style recall — saved media playback + human caption. */
export const ExperienceRecallShortsStage = memo(function ExperienceRecallShortsStage({
  item,
  volume,
  pin,
  className,
}: ExperienceRecallShortsStageProps) {
  const copy = useCopy();
  const shortsCopy = copy.feed.experience.recall.shorts;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);

  const contextId = item ? parseUploadMediaContextId(item.id) : null;
  const { url: mediaUrl, loading } = useMediaBlobUrl(contextId);
  const caption = buildExperienceRecallCaption({ item, volume, pin });
  const subline = item?.caption ?? pin?.label ?? volume?.title ?? null;

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !mediaUrl) {
      return;
    }
    if (playing) {
      void node.play().catch(() => setPlaying(false));
    } else {
      node.pause();
    }
  }, [mediaUrl, playing]);

  if (!item && !pin) {
    return null;
  }

  const season = item?.season ?? "summer";

  return (
    <div
      className={cn("mx-auto w-full max-w-[280px]", className)}
      data-experience-recall-shorts
      data-shorts-kind={item?.kind ?? pin?.kind}
    >
      <button
        type="button"
        className="group relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
        onClick={() => {
          if (mediaUrl && item?.kind === "video") {
            setPlaying((value) => !value);
          }
        }}
        aria-label={shortsCopy.playToggle}
      >
        {mediaUrl && item?.kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt={item.title}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        {mediaUrl && item?.kind === "video" ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="absolute inset-0 size-full object-cover"
            playsInline
            muted
            loop
            autoPlay
          />
        ) : null}

        {!mediaUrl && !loading ? (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br px-6 text-center",
              item ? PLACEHOLDER_GRADIENT[season] : "from-slate-700/40 to-slate-950",
            )}
          >
            <span className="text-4xl" aria-hidden>
              {item?.kind === "video" ? "🎬" : item?.kind === "photo" ? "📷" : "📍"}
            </span>
            <p className="mt-3 text-[13px] font-semibold text-white/88">{item?.title ?? pin?.label}</p>
            <p className="mt-1 text-[11px] text-white/45">{shortsCopy.memoryPlaceholder}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-[12px] text-white/55">{shortsCopy.loading}</p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-16">
          <p className="text-left text-[15px] font-semibold leading-snug text-white">{caption}</p>
          {subline ? (
            <p className="mt-1 line-clamp-2 text-left text-[12px] leading-relaxed text-white/62">
              {subline}
            </p>
          ) : null}
        </div>

        {item?.kind === "video" && mediaUrl ? (
          <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white/80">
            {playing ? "▶" : "❚❚"}
          </span>
        ) : null}
      </button>
    </div>
  );
});
