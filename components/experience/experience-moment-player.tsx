"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import { parseUploadMediaContextId } from "@/lib/location-ping/media-blob-store";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { cn } from "@/lib/utils";

export type ExperienceMomentPlayerProps = {
  item?: SpatialMediaItem | null;
  volume?: ExperienceVolume | null;
  pin?: ClassifiedGlobePin | null;
  className?: string;
};

/** Representative moment playback — no Shorts, no gradient chrome. */
export const ExperienceMomentPlayer = memo(function ExperienceMomentPlayer({
  item,
  volume,
  pin,
  className,
}: ExperienceMomentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const contextId = item ? parseUploadMediaContextId(item.id) : null;
  const { url: mediaUrl } = useMediaBlobUrl(contextId);

  const title = item?.title ?? pin?.label ?? volume?.title ?? "대표 장면";
  const caption = item?.caption ?? pin?.slot?.experienceTitle ?? null;

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

  return (
    <section
      className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}
      data-experience-moment-player
    >
      <div className="relative aspect-video w-full bg-muted">
        {mediaUrl && item?.kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt={title} className="size-full object-cover" />
        ) : null}
        {mediaUrl && item?.kind === "video" ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="size-full object-cover"
            playsInline
            muted
            loop
            autoPlay
          />
        ) : null}
        {!mediaUrl ? (
          <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
            {title}
          </div>
        ) : null}
        {mediaUrl && item?.kind === "video" ? (
          <button
            type="button"
            className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground"
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? "일시정지" : "재생"}
          </button>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        {caption ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{caption}</p>
        ) : null}
      </div>
    </section>
  );
});
