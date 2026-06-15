"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Globe, MapPin } from "lucide-react";
import { ExperienceMomentPlayer } from "@/components/experience/experience-moment-player";
import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";
import { FeedExperienceRunChips } from "@/components/feed/feed-experience-run-chips";
import { FeedRelatedContextStrip } from "@/components/feed/feed-related-context-strip";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { SlotRelatedContextBundle } from "@/lib/feed/resolve-slot-related-context";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import { globeViewForSharedPins } from "@/lib/peer-chat/globe-view-for-shared-pins";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type FeedExperienceRecallHeroProps = {
  volume: ExperienceVolume | null;
  headline: string | null;
  recallSubtitle?: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  runDeferred?: boolean;
  onRunMention?: (featureId: string) => void;
  relatedContext?: SlotRelatedContextBundle | null;
  onSelectRelatedExperience?: (eventId: string) => void;
  classifiedPins?: readonly ClassifiedGlobePin[];
  isPinnedToPersonalGlobe?: boolean;
  onPinToPersonalGlobe?: () => void;
  onOpenPersonalGlobe?: () => void;
  className?: string;
};

/** YT Music-style top recall — satellite globe + representative moment. */
export const FeedExperienceRecallHero = memo(function FeedExperienceRecallHero({
  volume,
  headline,
  recallSubtitle = null,
  expanded,
  onToggleExpanded,
  runDeferred = false,
  onRunMention,
  relatedContext = null,
  onSelectRelatedExperience,
  classifiedPins = [],
  isPinnedToPersonalGlobe = false,
  onPinToPersonalGlobe,
  onOpenPersonalGlobe,
  className,
}: FeedExperienceRecallHeroProps) {
  const copy = useCopy();
  const recallCopy = copy.feed.experience.recall;
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const globe = useMemo(
    () => globeViewForSharedPins(classifiedPins),
    [classifiedPins],
  );

  const momentItem = useMemo(() => {
    if (!volume) {
      return null;
    }
    const items = projectVolumeSpatialMedia(volume);
    return (
      items.find((row) => row.kind === "photo" || row.kind === "video") ?? items[0] ?? null
    );
  }, [volume]);

  if (!volume) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border-b border-white/8 bg-white/[0.02] px-4 py-8",
          className,
        )}
        data-feed-recall-hero
        data-feed-recall-state="empty"
      >
        <p className="max-w-[16rem] text-center text-[13px] leading-relaxed text-white/42">
          {recallCopy.empty}
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full shrink-0 items-center gap-3 border-b border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.995]",
          className,
        )}
        data-feed-recall-hero
        data-feed-recall-state="mini"
        onClick={onToggleExpanded}
        aria-expanded={false}
        aria-label={recallCopy.expand}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-lg ring-1 ring-sky-300/25">
          🧭
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{headline ?? volume.title}</p>
          {recallSubtitle ? (
            <p className="mt-0.5 truncate text-[12px] text-sky-100/75">{recallSubtitle}</p>
          ) : null}
          {relatedContext && onSelectRelatedExperience ? (
            <FeedRelatedContextStrip
              bundle={relatedContext}
              onSelectExperience={onSelectRelatedExperience}
              className="mt-1"
            />
          ) : (
            <p className="mt-0.5 text-[12px] text-white/45">{recallCopy.miniHint}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-sky-300/35 bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold text-sky-100/95">
          {copy.feed.experience.recallChip}
        </span>
        <ChevronUp className="size-5 shrink-0 text-white/35" aria-hidden />
      </button>
    );
  }

  return (
    <section
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-b border-white/8 bg-[#080a10]",
        "max-h-[min(58vh,480px)] min-h-[min(42vh,360px)]",
        className,
      )}
      data-feed-recall-hero
      data-feed-recall-state="full"
      aria-label={recallCopy.expand}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
            {copy.feed.experience.recallChip}
          </p>
          <p className="truncate text-[16px] font-semibold text-white">{headline ?? volume.title}</p>
          {recallSubtitle ? (
            <p className="mt-0.5 truncate text-[13px] text-sky-100/80">{recallSubtitle}</p>
          ) : null}
          {relatedContext && onSelectRelatedExperience ? (
            <FeedRelatedContextStrip
              bundle={relatedContext}
              onSelectExperience={onSelectRelatedExperience}
              className="mt-1.5"
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onPinToPersonalGlobe ? (
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold",
                isPinnedToPersonalGlobe
                  ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/30"
                  : "bg-sky-500/15 text-sky-100 ring-1 ring-sky-300/30",
              )}
              onClick={onPinToPersonalGlobe}
              aria-label={isPinnedToPersonalGlobe ? "내 지구본에 있음" : "내 지구본에 박기"}
            >
              <MapPin className="size-3.5" aria-hidden />
              {isPinnedToPersonalGlobe ? "박음" : "박기"}
            </button>
          ) : null}
          {onOpenPersonalGlobe ? (
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/85"
              onClick={onOpenPersonalGlobe}
              aria-label="내 지구본"
            >
              <Globe className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85"
            onClick={onToggleExpanded}
            aria-expanded
            aria-label={recallCopy.collapse}
          >
            {recallCopy.collapse}
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SpatialGlobeStage
          globe={globe}
          classifiedPins={classifiedPins}
          activePinId={activePinId}
          onPinPress={setActivePinId}
          variant="immersive"
          hideSyncMeta
          hideCenterCrosshair
          className="min-h-[min(34vh,300px)]"
        />
        {momentItem ? (
          <div className="px-4">
            <ExperienceMomentPlayer item={momentItem} volume={volume} />
          </div>
        ) : null}
        {onRunMention ? (
          <div className="border-t border-white/8 px-4 pt-3">
            <FeedExperienceRunChips deferred={runDeferred} onRun={onRunMention} />
          </div>
        ) : null}
      </div>
    </section>
  );
});
