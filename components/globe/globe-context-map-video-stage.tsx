"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { GlobeContextMediaFocusCard } from "@/components/globe/globe-context-media-focus-card";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobeMapMediaCardSize } from "@/hooks/use-globe-map-media-card-size";
import { useGlobeContextVideoSound } from "@/hooks/use-globe-context-video-sound";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { resolveGlobeContextNavigationStep } from "@/lib/globe/list-globe-context-navigation-order";
import {
  projectContextMediaReel,
  type ContextMediaReelItem,
} from "@/lib/globe/project-context-media-reel";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { resolveExperienceVolumeForEvent } from "@/lib/globe/resolve-globe-context-primary-video";
import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
  GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS,
  GLOBE_MAP_FOCUS_HERO_SHELL_CLASS,
} from "@/lib/globe/globe-map-focus-hero-layout";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const SWIPE_MIN_PX = 44;

export type GlobeContextMapVideoStageProps = {
  eventId: string | null | undefined;
  anchorLat?: number | null;
  anchorLng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  visible?: boolean;
  navigationEntries?: readonly GlobeContextTimelineEntry[];
  onDismiss?: () => void;
  onOpenDetails?: () => void;
  onHeroPress?: () => void;
  onNavigateContext?: (eventId: string) => void;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  className?: string;
};

function MapMediaSlide({
  item,
  playing,
  onPlayingChange,
  toggleSoundRef,
  onSoundOnChange,
}: {
  item: ContextMediaReelItem;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  toggleSoundRef: RefObject<(() => void) | null>;
  onSoundOnChange?: (soundOn: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { url: blobUrl, loading } = useMediaBlobUrl(
    item.allowLocalBlob === true ? item.mediaContextId : null,
  );
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.kind === "video";

  const { toggleSound, soundOn } = useGlobeContextVideoSound({
    videoRef,
    src,
    isVideo,
    playing,
    soundByDefault: false,
    onPlayFailed: () => onPlayingChange(false),
  });

  useEffect(() => {
    toggleSoundRef.current = toggleSound;
  }, [toggleSound, toggleSoundRef]);

  useEffect(() => {
    onSoundOnChange?.(soundOn);
  }, [onSoundOnChange, soundOn]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) {
      return;
    }
    if (playing) {
      void el.play().catch(() => onPlayingChange(false));
    } else {
      el.pause();
    }
  }, [isVideo, onPlayingChange, playing]);

  if (src && isVideo) {
    return (
      <video
        ref={videoRef}
        key={`${item.id}:${src}`}
        src={src}
        className={GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS}
        playsInline
        loop
        muted={!soundOn}
        preload="metadata"
      />
    );
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${item.id}:${src}`}
        src={src}
        alt=""
        className={GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS}
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex min-h-[9rem] w-full items-center justify-center bg-[#e8e8ed] px-3 text-center text-[13px] font-normal text-[#86868b]">
      {loading || item.pendingRemote
        ? `${item.kind === "video" ? "동영상" : "사진"} 불러오는 중…`
        : item.label}
    </div>
  );
}

/** Context media replay — floating card (lodging style) + user resize. */
export function GlobeContextMapVideoStage({
  eventId,
  visible = true,
  navigationEntries = [],
  onDismiss,
  onOpenDetails,
  onHeroPress,
  onNavigateContext,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
  className,
}: GlobeContextMapVideoStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const toggleVideoSoundRef = useRef<(() => void) | null>(null);
  const [revision, setRevision] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const {
    widthPx,
    pinchActiveRef,
    isResizing,
    onCardTouchStart,
    onCardTouchMove,
    onCardTouchEnd,
  } = useGlobeMapMediaCardSize();

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    void hydrateMediaContextStore().then(() => bump());
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
    };
  }, []);

  const reel = useMemo(() => {
    void revision;
    const key = eventId?.trim();
    if (!key) {
      return [] as ContextMediaReelItem[];
    }
    const event =
      findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
    const volume = resolveExperienceVolumeForEvent(key);
    return projectContextMediaReel({ event, volume, viewerUserId });
  }, [eventId, revision, viewerUserId]);

  const activeEvent = useMemo(() => {
    const key = eventId?.trim();
    if (!key) {
      return null;
    }
    return findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
  }, [eventId]);

  const contextTitle = useMemo(() => {
    if (!activeEvent) {
      return copy.globe.contextMediaFocusFallbackTitle;
    }
    return (
      activeEvent.place?.trim() ||
      activeEvent.title.trim() ||
      copy.globe.contextMediaFocusFallbackTitle
    );
  }, [activeEvent]);

  useEffect(() => {
    setMediaIndex(0);
    setPlaying(true);
  }, [eventId]);

  useEffect(() => {
    if (mediaIndex >= reel.length) {
      setMediaIndex(Math.max(0, reel.length - 1));
    }
  }, [mediaIndex, reel.length]);

  useEffect(() => {
    const active = visible && reel.length > 0;
    dispatchGlobeMapMediaFocus(active, "video");
    return () => {
      dispatchGlobeMapMediaFocus(false, "video");
    };
  }, [reel.length, visible]);

  const currentItem = reel[mediaIndex] ?? null;
  const canNavigateContext = navigationEntries.length > 1 && Boolean(onNavigateContext);

  const handleSwipeEnd = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) {
        return false;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          setMediaIndex((index) => Math.max(0, index - 1));
        } else {
          setMediaIndex((index) => Math.min(reel.length - 1, index + 1));
        }
        return true;
      }

      const key = eventId?.trim();
      if (!key || !onNavigateContext || navigationEntries.length === 0) {
        return true;
      }

      const step = resolveGlobeContextNavigationStep({
        entries: navigationEntries,
        currentEventId: key,
        direction: dy < 0 ? "next" : "prev",
      });
      if (step?.eventId && step.eventId !== key) {
        onNavigateContext(step.eventId);
      }
      return true;
    },
    [eventId, navigationEntries, onNavigateContext, reel.length],
  );

  const dismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  if (!visible || reel.length === 0) {
    return null;
  }

  const subtitle = currentItem?.recallCaption?.trim() || null;

  const mergeCardTouchStart = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchStart(event);
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (touch) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const mergeCardTouchMove = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchMove(event);
  };

  const mergeCardTouchEnd = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchEnd(event);
    if (pinchActiveRef.current || isResizing()) {
      touchStartRef.current = null;
      return;
    }
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    handleSwipeEnd(dx, dy);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[30] overflow-hidden",
        className,
      )}
      data-globe-context-map-video
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/45 backdrop-blur-md"
        aria-label={copy.globe.contextMediaFocusCloseAria}
        onClick={dismiss}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-[1] flex min-h-0 flex-col items-center justify-center overflow-y-auto overscroll-contain px-3 py-1"
        style={{
          top: "max(2.5rem, env(safe-area-inset-top))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
        }}
        data-globe-context-map-video-anchor
      >
        <div
          className={cn("pointer-events-auto", GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS)}
          style={{ width: widthPx }}
          data-globe-map-media-card-width={widthPx}
        >
          <GlobeContextMediaFocusCard
            className="w-full"
            title={contextTitle}
            recallCaption={subtitle}
            onClose={dismiss}
            closeAriaLabel={copy.globe.contextMediaFocusCloseAria}
            onHeroPress={onHeroPress ?? onOpenDetails}
            onTouchStart={mergeCardTouchStart}
            onTouchMove={mergeCardTouchMove}
            onTouchEnd={mergeCardTouchEnd}
            hero={
              <>
                {currentItem ? (
                  <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS}>
                    <MapMediaSlide
                      key={currentItem.id}
                      item={currentItem}
                      playing={playing}
                      onPlayingChange={setPlaying}
                      toggleSoundRef={toggleVideoSoundRef}
                    />
                  </div>
                ) : null}

                {reel.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-2 z-[3] flex justify-center gap-1.5">
                    {reel.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`${index + 1}`}
                        aria-current={index === mediaIndex}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMediaIndex(index);
                        }}
                        className={cn(
                          "size-1.5 rounded-full shadow-sm",
                          index === mediaIndex ? "bg-white" : "bg-white/45",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
