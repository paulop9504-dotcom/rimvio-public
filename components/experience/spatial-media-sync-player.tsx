"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { ExperienceMomentPlayer } from "@/components/experience/experience-moment-player";
import { ExperienceRecallShortsStage } from "@/components/feed/experience-recall-shorts-stage";
import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";
import {
  useSpatialContextSync,
  type SpatialContextSyncState,
} from "@/hooks/use-spatial-context-sync";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import { MEDIA_SPACETIME_UPDATED } from "@/lib/location-ping/media-context-store";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import { cn } from "@/lib/utils";

export type SpatialMediaSyncPlayerProps = {
  volume?: ExperienceVolume;
  items?: readonly SpatialMediaItem[];
  sync?: SpatialContextSyncState;
  hideGlobe?: boolean;
  classifiedPins?: readonly ClassifiedGlobePin[];
  /** Pin open — no map, no carousel, representative moment playback. */
  experienceOpen?: boolean;
  initialItemId?: string | null;
  className?: string;
};

export const SpatialMediaSyncPlayer = memo(function SpatialMediaSyncPlayer({
  volume,
  items: itemsProp,
  sync: syncProp,
  hideGlobe = false,
  classifiedPins = [],
  experienceOpen = false,
  initialItemId = null,
  className,
}: SpatialMediaSyncPlayerProps) {
  const [uploadedMediaTick, setUploadedMediaTick] = useState(0);
  const [globePinId, setGlobePinId] = useState<string | null>(null);

  useEffect(() => {
    const onUpdated = () => setUploadedMediaTick((tick) => tick + 1);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
    return () => window.removeEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
  }, []);

  const items = useMemo(
    () => itemsProp ?? (volume ? projectVolumeSpatialMedia(volume) : []),
    [itemsProp, volume, uploadedMediaTick],
  );
  const internalSync = useSpatialContextSync(items);
  const sync = syncProp ?? internalSync;

  useEffect(() => {
    const seed = initialItemId?.trim();
    if (!seed || !experienceOpen) {
      return;
    }
    const match = sync.items.find((row) => row.id === seed);
    if (match) {
      sync.selectItem(match.id);
      return;
    }
    const tail = seed.includes(":") ? seed.split(":").slice(1).join(":") : seed;
    const fuzzy = sync.items.find((row) => row.id.includes(tail));
    if (fuzzy) {
      sync.selectItem(fuzzy.id);
    }
  }, [experienceOpen, initialItemId, sync]);

  const forceHideGlobe = hideGlobe || experienceOpen;
  const activePinId =
    sync.selectedId && classifiedPins.some((pin) => pin.id === sync.selectedId)
      ? sync.selectedId
      : globePinId ?? sync.selectedId;

  const activePin = useMemo(
    () => classifiedPins.find((pin) => pin.id === activePinId) ?? null,
    [classifiedPins, activePinId],
  );

  const shortsItem =
    sync.selectedItem ??
    sync.items.find((row) => row.kind === "photo" || row.kind === "video") ??
    null;

  if (experienceOpen) {
    if (!shortsItem && !activePin) {
      return null;
    }
    return (
      <ExperienceMomentPlayer
        item={shortsItem}
        volume={volume}
        pin={shortsItem ? null : activePin}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(experienceOpen ? "py-2" : "space-y-3", className)}
      data-spatial-media-sync-player
      data-experience-open-player={experienceOpen ? "true" : undefined}
      data-experience-volume-id={volume?.id}
      data-spatial-selected-id={sync.selectedId ?? undefined}
    >
      {!forceHideGlobe && sync.globe && sync.frame ? (
        <SpatialGlobeStage
          globe={sync.globe}
          timeLabel={sync.frame.timeLabel}
          environmentLabel={sync.frame.environmentLabel}
          classifiedPins={classifiedPins}
          activePinId={activePinId}
          variant="immersive"
          hideSyncMeta
          hideCenterCrosshair
          className="min-h-[min(34vh,300px)]"
          onPinPress={(pinId) => {
            if (sync.items.some((item) => item.id === pinId)) {
              sync.selectItem(pinId);
              setGlobePinId(null);
              return;
            }
            setGlobePinId(pinId);
          }}
        />
      ) : null}

      {shortsItem || activePin ? (
        <ExperienceRecallShortsStage
          item={shortsItem}
          volume={volume}
          pin={shortsItem ? null : activePin}
        />
      ) : null}
    </div>
  );
});
