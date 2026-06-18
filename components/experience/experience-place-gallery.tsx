"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { PlaceGalleryItem } from "@/lib/globe/project-place-gallery";
import { cn } from "@/lib/utils";

function GalleryThumb({
  item,
  active,
  onSelect,
}: {
  item: PlaceGalleryItem;
  active: boolean;
  onSelect: () => void;
}) {
  const { url: blobUrl } = useMediaBlobUrl(item.mediaContextId);
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.mediaKind === "video";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative h-24 w-[4.75rem] shrink-0 overflow-hidden rounded-xl border bg-muted transition-all",
        active
          ? "border-primary/50 ring-2 ring-primary/25"
          : "border-border/80 opacity-90 hover:opacity-100",
      )}
      aria-label={item.label}
      aria-pressed={active}
    >
      {src && isVideo ? (
        <video
          src={src}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center px-1 text-center text-[9px] text-muted-foreground">
          {isVideo ? "▶" : item.label}
        </div>
      )}
    </button>
  );
}

function GalleryHero({ item }: { item: PlaceGalleryItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const { url: blobUrl } = useMediaBlobUrl(item.mediaContextId);
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.mediaKind === "video";

  useEffect(() => {
    setPlaying(true);
  }, [item.id]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !src || !isVideo) {
      return;
    }
    if (playing) {
      void node.play().catch(() => setPlaying(false));
    } else {
      node.pause();
    }
  }, [src, isVideo, playing]);

  return (
    <div className="relative aspect-[4/5] max-h-[min(52vh,420px)] w-full overflow-hidden rounded-2xl bg-muted">
      {src && isVideo ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className="size-full object-cover"
            playsInline
            muted
            loop
            autoPlay
            data-place-gallery-hero
          />
          <button
            type="button"
            className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? "일시정지" : "재생"}
          </button>
        </>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          data-place-gallery-hero
        />
      ) : (
        <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
          {item.label}
        </div>
      )}
    </div>
  );
}

export type ExperiencePlaceGalleryProps = {
  items: readonly PlaceGalleryItem[];
  activeId?: string | null;
  onActiveIdChange?: (id: string) => void;
  className?: string;
};

/** Google Maps–style horizontal place photo strip. */
export function ExperiencePlaceGallery({
  items,
  activeId,
  onActiveIdChange,
  className,
}: ExperiencePlaceGalleryProps) {
  if (items.length === 0) {
    return null;
  }

  const active = items.find((row) => row.id === activeId) ?? items[0]!;
  const videoCount = items.filter((row) => row.mediaKind === "video").length;
  const photoCount = items.length - videoCount;

  return (
    <section className={cn("space-y-3", className)} data-experience-place-gallery>
      <GalleryHero item={active} />
      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <GalleryThumb
              key={item.id}
              item={item}
              active={item.id === active.id}
              onSelect={() => onActiveIdChange?.(item.id)}
            />
          ))}
        </div>
      ) : null}
      <p className="text-[12px] text-muted-foreground">
        {photoCount > 0 ? `사진 ${photoCount}` : null}
        {photoCount > 0 && videoCount > 0 ? " · " : null}
        {videoCount > 0 ? `동영상 ${videoCount}` : null}
      </p>
    </section>
  );
}
