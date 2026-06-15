"use client";

import { useEffect, useRef, useState } from "react";
import { ContextMediaUploaderBadge } from "@/components/globe/context-media-uploader-badge";
import { ContextMediaDeleteButton } from "@/components/globe/context-media-delete-button";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
import { useGlobeContextVideoSound } from "@/hooks/use-globe-context-video-sound";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { copy } from "@/lib/copy/human-ko";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ui/shimmer";

function ContextMediaShortsSlide({
  item,
  eyebrow,
  index,
  total,
  fillViewport,
  embedded,
  selfDisplayName,
  selfAvatarUrl,
  eventId,
  viewerUserId,
  deletable,
  onMediaDeleted,
  variant = "default",
  slideIndex,
}: {
  item: ContextMediaReelItem;
  eyebrow: string;
  index: number;
  total: number;
  fillViewport?: boolean;
  /** Pin sheet — media lives in its own scroll pane (no overlap with info). */
  embedded?: boolean;
  selfDisplayName?: string | null;
  selfAvatarUrl?: string | null;
  eventId?: string | null;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  variant?: "default" | "bridge";
  slideIndex?: number;
}) {
  const bridge = variant === "bridge";
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
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
    visible,
    soundByDefault: embedded,
    onPlayFailed: () => setPlaying(false),
  });

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.6, 0.9] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const authorName =
    item.authorDisplayName?.trim() ||
    (item.allowLocalBlob ? selfDisplayName?.trim() || "나" : "친구");

  return (
    <section
      ref={rootRef}
      className={cn(
        "relative isolate flex shrink-0 snap-start snap-always flex-col",
        fillViewport && embedded && "box-border h-full min-h-full items-center justify-center px-2 py-2",
        fillViewport && !embedded && "min-h-full justify-start pb-4 pt-2",
        !fillViewport && "min-h-[min(78vh,680px)] justify-center px-3 py-2",
      )}
      data-globe-context-shorts-slide
      data-slide-index={slideIndex ?? index}
      data-media-kind={item.kind}
      data-bridge-media={bridge ? "true" : undefined}
    >
      <div
        className={cn(
          "relative mx-auto flex h-full max-h-full w-full items-center justify-center",
          bridge ? "max-w-[min(100%,400px)]" : "max-w-[min(100%,360px)]",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden",
            fillViewport && embedded
              ? "aspect-[9/16] h-full max-h-full w-auto max-w-full"
              : bridge
                ? "aspect-[9/16] w-full rounded-[1.25rem] bg-muted shadow-sm ring-1 ring-border/60"
                : "aspect-[9/16] w-full rounded-[1.25rem] shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/10 bg-black",
            fillViewport && embedded &&
              (bridge
                ? "rounded-[1.25rem] bg-muted shadow-sm ring-1 ring-border/60"
                : "rounded-[1.25rem] shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/10 bg-black"),
          )}
        >
        {isVideo ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[6] flex items-center justify-end gap-2 px-3">
            <div className="pointer-events-auto flex min-w-0 items-center gap-1.5">
              <ContextMediaVideoSoundButton
                soundOn={soundOn}
                variant={bridge ? "icon" : "pill"}
                onToggleSound={() => {
                  toggleSound();
                  if (!playing) {
                    setPlaying(true);
                  }
                }}
              />
              {eventId && deletable ? (
                <ContextMediaDeleteButton
                  item={item}
                  eventId={eventId}
                  viewerUserId={viewerUserId}
                  enabled={deletable}
                  variant={bridge ? "minimal" : "default"}
                  className="relative bottom-auto left-auto size-9 shrink-0"
                  onDeleted={onMediaDeleted}
                />
              ) : null}
            </div>
            {!bridge ? (
              <span className="pointer-events-none shrink-0 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-semibold text-white ring-1 ring-white/20">
                {visible && playing ? "일시정지" : "재생"}
              </span>
            ) : null}
          </div>
        ) : null}
        {isVideo && src ? (
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            aria-label={playing ? "일시정지" : "재생"}
            onClick={() => {
              setPlaying((value) => !value);
            }}
          />
        ) : null}
        {src && isVideo ? (
          <video
            key={`${item.id}:${src}`}
            ref={videoRef}
            src={src}
            className={cn(
              "relative z-0 size-full object-cover",
              bridge && "object-contain",
            )}
            playsInline
            loop
            preload="metadata"
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${item.id}:${src}`}
            src={src}
            alt=""
            className={cn(
              "size-full object-cover",
              bridge && "object-contain",
            )}
            loading="lazy"
          />
        ) : item.pendingRemote ? (
          <div className="relative flex size-full flex-col items-center justify-center gap-4 overflow-hidden px-6">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/35 via-primary/20 to-sky-500/30"
              aria-hidden
            />
            <PeerProfileAvatar
              displayName={authorName}
              avatarUrl={item.authorAvatarUrl}
              size="lg"
              className="relative z-[1] size-16 ring-4 ring-white/20"
            />
            <div className="relative z-[1] space-y-1 text-center">
              <Shimmer className="mx-auto h-2 w-24 rounded-full opacity-60" />
              <p className="text-[14px] font-semibold text-white/90">
                {copy.globe.bridgeMediaPending(authorName, isVideo ? "video" : "photo")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {loading ? "불러오는 중…" : item.label}
          </div>
        )}

        {!bridge ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-4 pb-4 pt-24",
              "bg-gradient-to-t from-black/85 via-black/35 to-transparent",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
              {eyebrow}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white">
              {item.recallCaption}
            </p>
          </div>
        ) : null}

        {!bridge ? (
          <ContextMediaUploaderBadge
            item={item}
            selfDisplayName={selfDisplayName}
            selfAvatarUrl={selfAvatarUrl}
            className="right-3 top-3"
          />
        ) : null}

        {!bridge ? (
          <span className="pointer-events-none absolute right-3 top-12 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/90">
            {index + 1}/{total}
          </span>
        ) : null}

        {isVideo ? null : eventId && deletable ? (
          <ContextMediaDeleteButton
            item={item}
            eventId={eventId}
            viewerUserId={viewerUserId}
            enabled={deletable}
            variant={bridge ? "minimal" : "default"}
            onDeleted={onMediaDeleted}
          />
        ) : null}
        </div>
      </div>
    </section>
  );
}

export type GlobeContextMediaShortsReelProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  /** Each slide fills the scroll viewport — Instagram / Shorts snap. */
  fillViewport?: boolean;
  /** Pin sheet — reel omits wrapper height; slides snap inside parent pane only. */
  embedded?: boolean;
  className?: string;
  eventId?: string | null;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  variant?: "default" | "bridge";
};

/** Vertical Shorts reel — all photos & videos in one context. */
export function GlobeContextMediaShortsReel({
  items,
  title,
  place,
  fillViewport = false,
  embedded = false,
  className,
  eventId,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
  variant = "default",
}: GlobeContextMediaShortsReelProps) {
  const [selfDisplayName, setSelfDisplayName] = useState<string | null>(null);
  const [selfAvatarUrl, setSelfAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyAccountProfile()
      .then((profile) => {
        setSelfDisplayName(
          profile?.displayName?.trim() ||
            profile?.rimvioId?.trim() ||
            "나",
        );
        setSelfAvatarUrl(profile?.avatarUrl?.trim() || null);
      })
      .catch(() => {
        setSelfDisplayName("나");
      });
  }, []);

  if (items.length === 0) {
    return null;
  }

  const eyebrow = [title, place].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        fillViewport && embedded && "contents",
        fillViewport && !embedded && "min-h-0",
        !fillViewport && "space-y-1",
        className,
      )}
      data-globe-context-shorts-reel
      data-globe-context-shorts-count={items.length}
      data-globe-context-shorts-embedded={embedded ? "true" : undefined}
    >
      {items.map((item, index) => (
        <ContextMediaShortsSlide
          key={item.id}
          item={item}
          eyebrow={eyebrow}
          index={index}
          total={items.length}
          fillViewport={fillViewport}
          embedded={embedded}
          selfDisplayName={selfDisplayName}
          selfAvatarUrl={selfAvatarUrl}
          eventId={eventId}
          viewerUserId={viewerUserId}
          deletable={deletable}
          onMediaDeleted={onMediaDeleted}
          variant={variant}
          slideIndex={index}
        />
      ))}
      {!fillViewport ? (
        <p className="px-3 pb-1 text-center text-[11px] text-muted-foreground">
          {items.length}개 · 아래로 스와이프
        </p>
      ) : null}
    </div>
  );
}
