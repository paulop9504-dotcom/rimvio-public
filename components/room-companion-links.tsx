"use client";

import { Sparkles } from "lucide-react";
import { findSimilarLinks } from "@/lib/links/similar-links";
import {
  findRoomSparkLinks,
  type RoomSparkLink,
} from "@/lib/links/room-spark-links";
import { SimilarLinksRow } from "@/components/similar-links-row";
import { useHomeCountry } from "@/hooks/use-home-country";
import { cn } from "@/lib/utils";
import type { LinkRow } from "@/types/database";

function SparkLinksRow({
  sparks,
  className,
}: {
  sparks: RoomSparkLink[];
  className?: string;
}) {
  if (sparks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="size-3 text-violet-500" aria-hidden />
          상상력 링크
        </p>
        <span className="text-[10px] text-muted-foreground/80">옆으로 밀기</span>
      </div>
      <div
        className={cn(
          "flex gap-2.5 overflow-x-auto pb-0.5",
          "touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {sparks.map((spark) => (
          <a
            key={spark.id}
            href={spark.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex max-w-[10.5rem] shrink-0 flex-col rounded-2xl px-3.5 py-2.5",
              "bg-gradient-to-br from-violet-50 to-fuchsia-50",
              "ring-1 ring-violet-200/60 transition-transform active:scale-[0.98]"
            )}
          >
            <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
              {spark.title}
            </span>
            <span className="mt-1 line-clamp-2 text-[11px] text-violet-700/80">
              {spark.subtitle}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function RoomCompanionLinks({
  current,
  roomLinks,
  onOpenRoomLink,
  className,
}: {
  current: LinkRow;
  roomLinks: LinkRow[];
  onOpenRoomLink?: (link: LinkRow) => void;
  className?: string;
}) {
  const similar = findSimilarLinks(current, roomLinks, 4);
  const { homeCountry } = useHomeCountry();
  const sparks = findRoomSparkLinks(current, roomLinks, 3, {
    homeCountry: homeCountry ?? undefined,
  });

  if (similar.length === 0 && sparks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-[var(--space-phi)]", className)}>
      <SimilarLinksRow current={current} peers={similar} onOpen={onOpenRoomLink} />
      <SparkLinksRow sparks={sparks} />
    </div>
  );
}
