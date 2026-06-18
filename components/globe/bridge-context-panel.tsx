"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  Car,
  ImagePlus,
  MapPin,
  MessageCircle,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useBridgeContextEnvironment } from "@/hooks/use-bridge-context-environment";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { buildBridgeContextRecallLine } from "@/lib/globe/build-bridge-context-recall-line";
import { countEventMediaPoolMatches } from "@/lib/globe/count-event-media-pool-matches";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import type { ExperienceHeroProjection } from "@/lib/globe/project-experience-hero";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isDomesticMapPlace } from "@/lib/resolvers/place-map-region";
import {
  buildEntityNavigateHref,
} from "@/lib/resolvers/map-app-launch";
import { readMapApp } from "@/lib/preferences/map-app";
import type { WeatherCondition } from "@/lib/context-resolver/types";
import { weatherPrepEmoji } from "@/lib/plan-context/weather-prep-visual";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type BridgeContextParticipant = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type BridgeContextPanelProps = {
  event: EventCandidate;
  hero: ExperienceHeroProjection;
  allEvents: readonly EventCandidate[];
  reelItems: readonly ContextMediaReelItem[];
  volume?: ExperienceVolume | null;
  viewerUserId?: string | null;
  participants: readonly BridgeContextParticipant[];
  activeAuthorFilter: string | null;
  onAuthorFilterChange: (userId: string | null) => void;
  onShowFilteredMedia: () => void;
  onOpenTalk: () => void;
  onOpenMediaPool: () => void;
  onNoteSaved?: () => void;
  className?: string;
};

function BridgeContextSection({
  eyebrow,
  children,
  className,
}: {
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

function BridgeContextCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-card px-4 py-3.5 shadow-sm ring-1 ring-border/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

function BridgeContextActionChip({
  icon,
  label,
  hint,
  onPress,
  accent = "default",
  badge,
}: {
  icon: ReactNode;
  label: string;
  hint?: string | null;
  onPress: () => void;
  accent?: "default" | "primary";
  badge?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "flex min-h-[4.25rem] flex-col items-start justify-center gap-1 rounded-2xl px-3.5 py-3 text-left shadow-sm ring-1 active:scale-[0.98]",
        accent === "primary"
          ? "bg-primary text-primary-foreground ring-primary/20"
          : "bg-card text-foreground ring-border/70",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            accent === "primary" ? "bg-primary-foreground/15" : "bg-muted",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {label}
        </span>
        {badge != null && badge > 0 ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {hint ? (
        <span
          className={cn(
            "line-clamp-1 pl-10 text-[11px] font-medium",
            accent === "primary" ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function buildCalendarHref(input: {
  title: string;
  place: string;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title.trim() || "다시 만나기",
    location: input.place.trim(),
    details: input.place.trim(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Bridge 맥락 탭 — recall · environment · people · continue. */
export function BridgeContextPanel({
  event,
  hero,
  allEvents,
  reelItems,
  volume,
  viewerUserId,
  participants,
  activeAuthorFilter,
  onAuthorFilterChange,
  onShowFilteredMedia,
  onOpenTalk,
  onOpenMediaPool,
  onNoteSaved,
  className,
}: BridgeContextPanelProps) {
  const environment = useBridgeContextEnvironment(event, true);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const recall = useMemo(
    () =>
      buildBridgeContextRecallLine({
        event,
        allEvents,
        reelItems,
        volume,
        viewerUserId,
      }),
    [event, allEvents, reelItems, volume, viewerUserId],
  );

  const poolMatchCount = useMemo(() => countEventMediaPoolMatches(event), [event, reelItems.length]);

  const savedNote = readPinContextNote(event);
  const noteValue = noteDraft ?? savedNote;

  const people = useMemo(() => {
    const byId = new Map<string, BridgeContextParticipant>();
    for (const row of participants) {
      const id = row.userId.trim();
      if (!id) {
        continue;
      }
      byId.set(id, row);
    }
    for (const item of reelItems) {
      const id = item.ownerUserId?.trim() || item.authorDisplayName?.trim();
      if (!id || byId.has(id)) {
        continue;
      }
      byId.set(id, {
        userId: id,
        displayName: item.authorDisplayName?.trim() || "친구",
        avatarUrl: item.authorAvatarUrl ?? null,
      });
    }
    return [...byId.values()].filter(
      (row) => !viewerUserId || row.userId !== viewerUserId,
    );
  }, [participants, reelItems, viewerUserId]);

  const mapApp = readMapApp(
    isDomesticMapPlace({ placeName: hero.place, title: hero.title, sourceUrl: hero.place }),
  );

  const handleSaveNote = async () => {
    const trimmed = noteValue.trim();
    if (!trimmed || trimmed === savedNote.trim()) {
      return;
    }
    setNoteBusy(true);
    try {
      await patchExperiencePinContext(event.id, { note: trimmed });
      setNoteDraft(null);
      onNoteSaved?.();
      toast.success(copy.globe.bridgeContextNoteSaved);
    } catch {
      toast.error("저장하지 못했어요");
    } finally {
      setNoteBusy(false);
    }
  };

  const selectAuthor = (userId: string | null) => {
    onAuthorFilterChange(userId);
    if (userId) {
      onShowFilteredMedia();
    }
  };

  return (
    <div className={cn("space-y-5 pb-2", className)} data-bridge-context-panel>
      <BridgeContextSection eyebrow={copy.globe.bridgeContextRecallEyebrow}>
        <BridgeContextCard>
          <p className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
            {recall.primary}
          </p>
          {recall.secondary ? (
            <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">
              {recall.secondary}
            </p>
          ) : null}
          {recall.dateLabel ? (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
              {recall.dateLabel}
            </p>
          ) : null}
        </BridgeContextCard>
      </BridgeContextSection>

      <BridgeContextSection eyebrow={copy.globe.bridgeContextEnvironmentEyebrow}>
        <BridgeContextCard className="space-y-2.5">
          {environment.loading && !environment.weatherLine && !environment.trafficLine ? (
            <p className="text-[13px] text-muted-foreground">
              {copy.globe.bridgeContextWeatherLoading}
            </p>
          ) : null}
          {environment.weatherLine ? (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[18px] leading-none" aria-hidden>
                {weatherPrepEmoji(environment.weatherCondition as WeatherCondition)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-foreground">
                  {environment.weatherLine}
                </p>
                {environment.place ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {environment.place} · 지금
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {environment.trafficLine ? (
            <div className="flex items-start gap-2.5 border-t border-border/60 pt-2.5">
              <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-muted">
                <Car className="size-3.5 text-muted-foreground" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground">
                {environment.trafficLine}
              </p>
            </div>
          ) : null}
          {!environment.loading &&
          !environment.weatherLine &&
          !environment.trafficLine ? (
            <p className="text-[13px] text-muted-foreground">
              {copy.globe.bridgeContextEnvironmentEmpty}
            </p>
          ) : null}
        </BridgeContextCard>
      </BridgeContextSection>

      <BridgeContextSection eyebrow={copy.globe.bridgeContextPeopleEyebrow}>
        <BridgeContextCard className="space-y-3">
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => selectAuthor(null)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1.5",
                activeAuthorFilter === null && "opacity-100",
              )}
            >
              <span
                className={cn(
                  "flex size-[3.75rem] items-center justify-center rounded-full text-[11px] font-bold ring-2",
                  activeAuthorFilter === null
                    ? "bg-primary text-primary-foreground ring-primary/30"
                    : "bg-muted text-muted-foreground ring-transparent",
                )}
              >
                ALL
              </span>
              <span className="max-w-[4rem] truncate text-[11px] font-medium text-muted-foreground">
                {copy.globe.bridgeContextFilterAll}
              </span>
            </button>
            {people.map((row) => {
              const selected = activeAuthorFilter === row.userId;
              return (
                <button
                  key={row.userId}
                  type="button"
                  onClick={() => selectAuthor(row.userId)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <PeerProfileAvatar
                    displayName={row.displayName}
                    avatarUrl={row.avatarUrl}
                    size="lg"
                    className={cn(
                      "size-[3.75rem] ring-2",
                      selected ? "ring-primary" : "ring-transparent",
                    )}
                  />
                  <span className="max-w-[4rem] truncate text-[11px] font-medium text-foreground">
                    {row.displayName}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onOpenTalk}
            className="flex w-full items-center gap-3 rounded-2xl bg-muted/70 px-3.5 py-3 text-left active:scale-[0.99]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-background shadow-sm">
              <MessageCircle className="size-4 text-primary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-foreground">
                {copy.globe.bridgeContextTalkCta}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {copy.globe.bridgeContextTalkHint}
              </span>
            </span>
          </button>
        </BridgeContextCard>
      </BridgeContextSection>

      <BridgeContextSection eyebrow={copy.globe.bridgeContextActionsEyebrow}>
        <div className="grid grid-cols-2 gap-2.5">
          <BridgeContextActionChip
            icon={<MapPin className="size-4 text-primary" aria-hidden />}
            label={copy.globe.bridgeContextNavCta}
            hint={hero.place}
            onPress={() => {
              const href = buildEntityNavigateHref(mapApp, { placeName: hero.place });
              openSpawnAction({ deeplink: href });
            }}
          />
          <BridgeContextActionChip
            icon={<CalendarPlus className="size-4 text-primary" aria-hidden />}
            label={copy.globe.bridgeContextScheduleCta}
            hint={hero.title}
            onPress={() => {
              openSpawnAction({
                deeplink: buildCalendarHref({
                  title: hero.title,
                  place: hero.place,
                }),
              });
            }}
          />
          <BridgeContextActionChip
            icon={<ImagePlus className="size-4 text-primary" aria-hidden />}
            label={copy.globe.bridgeContextPoolCta}
            hint={copy.globe.bridgeContextPoolHint(poolMatchCount)}
            badge={poolMatchCount}
            onPress={onOpenMediaPool}
          />
          <BridgeContextActionChip
            icon={<StickyNote className="size-4 text-primary" aria-hidden />}
            label={copy.globe.bridgeContextNoteCta}
            hint={savedNote.trim() || copy.globe.bridgeContextNoteEmpty}
            onPress={() => {
              const root = document.querySelector<HTMLElement>(
                "[data-bridge-context-note]",
              );
              root?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              root?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            }}
          />
        </div>

        <div
          className="rounded-[20px] bg-card px-3.5 py-3 shadow-sm ring-1 ring-border/70"
          data-bridge-context-note
        >
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <StickyNote className="size-3.5" aria-hidden />
            {copy.globe.bridgeContextNoteCta}
          </label>
          <textarea
            value={noteValue}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={() => void handleSaveNote()}
            placeholder={copy.globe.bridgeContextNoteEmpty}
            rows={2}
            disabled={noteBusy}
            className="mt-2 w-full resize-none rounded-xl bg-muted/50 px-3 py-2.5 text-[14px] leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/70"
          />
        </div>
      </BridgeContextSection>
    </div>
  );
}
