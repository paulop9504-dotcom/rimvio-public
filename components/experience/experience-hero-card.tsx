"use client";

import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { cn } from "@/lib/utils";

export type ExperienceHeroCardProps = {
  title: string;
  date: string | null;
  place: string;
  peopleCount: number;
  photoCount: number;
  videoCount: number;
  heroImageContextId?: string | null;
  recallLine?: string | null;
  className?: string;
};

/** Pin open hero — 3-second understanding surface. */
export function ExperienceHeroCard({
  title,
  date,
  place,
  peopleCount,
  photoCount,
  videoCount,
  heroImageContextId = null,
  recallLine = null,
  className,
}: ExperienceHeroCardProps) {
  const { url: heroImage } = useMediaBlobUrl(heroImageContextId);

  const datePlace = [date, place].filter(Boolean).join(" · ");

  return (
    <section
      className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}
      data-experience-hero-card
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="size-full object-cover"
            data-experience-hero-image
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
            대표 사진
          </div>
        )}
      </div>
      <div className="space-y-1.5 px-4 py-4">
        <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h2>
        {datePlace ? (
          <p className="text-[14px] text-muted-foreground">{datePlace}</p>
        ) : null}
        {peopleCount > 0 ? (
          <p className="text-[14px] text-foreground/85">{peopleCount}명 참석</p>
        ) : null}
        <p className="text-[13px] font-medium text-foreground/80">
          {photoCount > 0 ? `📷${photoCount}` : null}
          {videoCount > 0
            ? `${photoCount > 0 ? "  " : ""}🎥${videoCount}`
            : null}
        </p>
        {recallLine ? (
          <p className="pt-1 text-[13px] text-muted-foreground">{recallLine}</p>
        ) : null}
      </div>
    </section>
  );
}
