"use client";

import { Bookmark, ChevronRight, MapPin, Navigation } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PlaceFoodPhotoGallery } from "@/components/action-chat/place-food-photo-gallery";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import {
  persistPlaceToKnowledge,
  placeWireOptionToPayload,
} from "@/lib/persistence/persistence-bridge";
import { cn } from "@/lib/utils";

type PlaceDiscoveryCardsProps = {
  wire: CafeDiscoveryWire;
  containerId?: string | null;
  className?: string;
};

type PlaceOption = CafeDiscoveryWire["options"][number];

/** IDEO field-note palette — warm paper, human ink, single accent. */
const IDEO = {
  paper: "#FFFCF7",
  frame: "#F3EDE4",
  border: "#E3D9CC",
  ink: "#1C1917",
  inkBody: "#44403C",
  inkMuted: "#78716C",
  accent: "#E85D04",
  accentRing: "#FDBA74",
} as const;

function resolveCategoryLabel(option: PlaceOption): string {
  const primary = option.category?.split(" · ")[0]?.trim();
  return primary || "맛집";
}

function buildContextLine(wire: CafeDiscoveryWire): string {
  const summary = wire.summary?.trim();
  if (summary && summary.length <= 48) {
    return summary;
  }
  const entity = wire.options[0]?.name.trim().split(/\s+/)[0];
  if (entity) {
    return `‘${entity}’에 맞춰 골라봤어요`;
  }
  return "지금 대화에 맞는 추천이에요";
}

function buildConclusion(option: PlaceOption): string {
  const open = /영업 중/.test(option.reason);
  if (open && option.travel_minutes > 0) {
    return `지금 ${option.travel_minutes}분 거리,\n영업 중이에요`;
  }
  if (open) {
    return "지금 영업 중이라\n바로 가기 좋아요";
  }
  if (option.travel_minutes > 0) {
    return `${option.travel_minutes}분이면\n도착할 수 있어요`;
  }
  if (option.rating >= 4) {
    return "평이 괜찮아서\n한번 가볼 만해요";
  }
  return "이번에 가보기\n좋은 곳이에요";
}

function buildReasonLine(option: PlaceOption): string {
  const parts: string[] = [resolveCategoryLabel(option)];
  if (option.rating > 0) {
    parts.push(`★ ${option.rating.toFixed(1)}`);
  }
  if (option.arrive_at?.trim()) {
    parts.push(`${option.arrive_at} 도착`);
  }
  const trimmed = option.reason?.trim();
  if (trimmed && trimmed.length <= 56 && !parts.some((p) => trimmed.includes(p))) {
    parts.push(trimmed);
  }
  return parts.join(" · ");
}

function resolvePhotos(option: PlaceOption): string[] {
  const photoUrls = option.photo_urls ?? [];
  if (photoUrls.length > 0) {
    return photoUrls;
  }
  return option.thumbnail_url ? [option.thumbnail_url] : [];
}

function resolveActions(option: PlaceOption): {
  primaryHref: string;
  mapHref: string | null;
} {
  const buttons = option.action_buttons;
  const nav = buttons.find((b) => /티맵|길찾|navigation/i.test(b.label));
  const map = buttons.find((b) => /지도|map/i.test(b.label));
  const primaryHref = nav?.href ?? map?.href ?? buttons[0]?.href ?? "#";
  const mapHref = map?.href && map.href !== primaryHref ? map.href : null;
  return { primaryHref, mapHref };
}

const SWIPE_THRESHOLD_PX = 48;

function PlaceFoodPhotoEvidence({
  name,
  photos,
  onOpenGallery,
  onIndexChange,
}: {
  name: string;
  photos: string[];
  onOpenGallery: () => void;
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const initial = name.trim().charAt(0) || "맛";
  const hasMultiple = photos.length > 1;
  const active = photos[index] ?? photos[0] ?? null;

  const goTo = (next: number | ((value: number) => number)) => {
    setIndex((value) => {
      const resolved = typeof next === "function" ? next(value) : next;
      onIndexChange?.(resolved);
      return resolved;
    });
  };

  const handleSwipeEnd = (clientX: number, clientY: number) => {
    if (!touchStart.current || !hasMultiple) {
      touchStart.current = null;
      return;
    }
    const dx = clientX - touchStart.current.x;
    const dy = clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      didSwipe.current = true;
      goTo((value) =>
        dx < 0 ? (value + 1) % photos.length : (value - 1 + photos.length) % photos.length
      );
    }
  };

  const handlePhotoClick = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    onOpenGallery();
  };

  return (
    <div
      className="rounded-[14px] p-2 touch-pan-y"
      style={{ backgroundColor: IDEO.frame }}
    >
      <div
        className="relative overflow-hidden rounded-[11px] bg-[#E7E5E4] shadow-[inset_0_1px_2px_rgba(28,25,23,0.06)]"
        style={{ aspectRatio: "3 / 2" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          touchStart.current = { x: t.clientX, y: t.clientY };
          didSwipe.current = false;
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) handleSwipeEnd(t.clientX, t.clientY);
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          touchStart.current = { x: e.clientX, y: e.clientY };
          didSwipe.current = false;
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse" && touchStart.current) {
            handleSwipeEnd(e.clientX, e.clientY);
          }
        }}
      >
        <button
          type="button"
          onClick={handlePhotoClick}
          className="relative block size-full select-none"
          aria-label={`${name} 사진 ${photos.length}장 · 크게 보기`}
        >
          {active ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active}
              alt=""
              draggable={false}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="text-3xl font-bold text-[#1C1917]/10" aria-hidden>
                {initial}
              </span>
            </div>
          )}
        </button>

        {hasMultiple ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1C1917]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.map((url, i) => (
                <button
                  key={`${name}-dot-${url}`}
                  type="button"
                  aria-label={`사진 ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i);
                  }}
                  className="flex size-5 items-center justify-center"
                >
                  <span
                    className={cn(
                      "rounded-full transition-all",
                      i === index
                        ? "size-2 bg-rimvio-surface shadow-sm"
                        : "size-1.5 bg-rimvio-surface/45"
                    )}
                  />
                </button>
              ))}
            </div>
            <span
              className="pointer-events-none absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white"
              style={{ backgroundColor: "rgba(28, 25, 23, 0.52)" }}
            >
              {index + 1}/{photos.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PlaceDiscoveryCard({
  option,
  containerId,
  contextLine,
  saved,
  onSaved,
}: {
  option: PlaceOption;
  containerId?: string | null;
  contextLine: string;
  saved: boolean;
  onSaved: () => void;
}) {
  const conclusion = buildConclusion(option);
  const reason = buildReasonLine(option);
  const { primaryHref, mapHref } = resolveActions(option);
  const photos = useMemo(() => resolvePhotos(option), [option]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasMultiplePhotos = photos.length > 1;

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const result = await persistPlaceToKnowledge(
        placeWireOptionToPayload(option),
        containerId ?? undefined
      );
      onSaved();
      toast("대화에 남겨뒀어요", {
        description: `${option.name} · ${result.container?.title ?? "장소"}`,
      });
    } catch {
      toast.error("저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <article
        className={cn(
          "relative mr-auto w-full overflow-hidden",
          "rounded-[22px] rounded-tl-[8px]",
          "border-[1.5px]",
          "shadow-[0_1px_0_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)]"
        )}
        style={{
          backgroundColor: IDEO.paper,
          borderColor: IDEO.border,
          maxWidth: "19.5rem",
        }}
      >
        <div
          className="absolute bottom-6 left-0 top-6 w-[3px] rounded-r-full"
          style={{ backgroundColor: IDEO.accent }}
          aria-hidden
        />

        <div className="pl-6 pr-5 pb-6 pt-6">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ backgroundColor: IDEO.frame, color: IDEO.inkMuted }}
            >
              제안
            </span>
          </div>

          <p
            className="mt-4 text-[12px] font-medium leading-[1.5]"
            style={{ color: IDEO.inkMuted }}
          >
            {contextLine}
          </p>

          <h3
            className="mt-5 whitespace-pre-line text-[21px] font-bold leading-[1.28] tracking-[-0.02em]"
            style={{ color: IDEO.ink }}
          >
            {conclusion}
          </h3>

          <div
            className="my-6 h-px w-full"
            style={{ backgroundColor: IDEO.border }}
            role="presentation"
          />

          <p className="text-[14px] leading-[1.55]" style={{ color: IDEO.inkBody }}>
            {reason}
          </p>
          <p
            className="mt-3 text-[16px] font-semibold leading-snug tracking-[-0.01em]"
            style={{ color: IDEO.ink }}
          >
            {option.name}
          </p>

          <div className="mt-7">
            <PlaceFoodPhotoEvidence
              name={option.name}
              photos={photos}
              onOpenGallery={() => setGalleryOpen(true)}
              onIndexChange={setPhotoIndex}
            />
          </div>

          <div className="mt-7 space-y-4">
            <a
              href={primaryHref}
              className={cn(
                "flex min-h-[3rem] w-full items-center justify-center gap-2.5",
                "rounded-full text-[15px] font-bold text-white",
                "transition active:scale-[0.98]",
                "shadow-[0_2px_0_rgba(204,79,0,0.35),0_6px_16px_-4px_rgba(232,93,4,0.45)]",
                "hover:brightness-[1.03]"
              )}
              style={{ backgroundColor: IDEO.accent }}
            >
              <Navigation className="size-[19px]" strokeWidth={2.5} />
              <span>여기로 갈게요</span>
              <ChevronRight className="size-4 opacity-80" aria-hidden />
            </a>

            <div
              className="flex flex-wrap items-center gap-2 pt-1"
              style={{ color: IDEO.inkMuted }}
            >
              {hasMultiplePhotos ? (
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition hover:bg-[#F3EDE4]"
                  style={{ color: IDEO.accent }}
                >
                  사진 {photoIndex + 1}/{photos.length}
                </button>
              ) : null}
              {mapHref ? (
                <a
                  href={mapHref}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition hover:bg-[#F3EDE4]"
                  style={{ borderColor: IDEO.border, color: IDEO.inkBody }}
                >
                  <MapPin className="size-3.5" strokeWidth={2} />
                  지도
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleSave}
                disabled={saved || saving}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                  saved ? "border-[#FDBA74] bg-[#FFF4ED]" : "hover:bg-[#F3EDE4]"
                )}
                style={{
                  borderColor: saved ? IDEO.accentRing : IDEO.border,
                  color: saved ? IDEO.accent : IDEO.inkBody,
                }}
              >
                <Bookmark
                  className={cn("size-3.5", saved && "fill-current")}
                  strokeWidth={2}
                />
                {saved ? "남겨 둠" : "대화에 남기기"}
              </button>
            </div>
          </div>
        </div>
      </article>

      <PlaceFoodPhotoGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        placeName={option.name}
        photos={photos}
        startIndex={photoIndex}
      />
    </>
  );
}

/** IDEO field-note cards — chat-aligned shape, warm paper, accent spine, generous rhythm. */
export function PlaceDiscoveryCards({
  wire,
  containerId,
  className,
}: PlaceDiscoveryCardsProps) {
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const contextLine = buildContextLine(wire);

  if (!wire.options.length) {
    return null;
  }

  return (
    <div
      className={cn("flex w-full flex-col items-start gap-6", className)}
      style={{
        fontFamily:
          '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
      }}
    >
      {wire.options.map((option) => (
        <PlaceDiscoveryCard
          key={option.name}
          option={option}
          containerId={containerId}
          contextLine={contextLine}
          saved={savedNames.has(option.name)}
          onSaved={() =>
            setSavedNames((prev) => new Set(prev).add(option.name))
          }
        />
      ))}
    </div>
  );
}
