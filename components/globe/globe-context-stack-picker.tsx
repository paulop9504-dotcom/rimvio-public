"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MapPin, X } from "lucide-react";
import { useRelationshipMeaningLine } from "@/hooks/use-relationship-meaning-line";
import { useGlobeContextPrimaryPeer } from "@/hooks/use-globe-context-primary-peer";
import { projectExperienceHeroFromCluster } from "@/lib/globe/project-experience-hero";
import {
  GLOBE_CONTEXT_STACK_VISIBLE_MAX,
} from "@/lib/globe/resolve-globe-contexts-near-tap";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { cn } from "@/lib/utils";

export type GlobeContextStackPickerProps = {
  clusters: readonly PinCluster[];
  visible?: boolean;
  onSelect: (cluster: PinCluster) => void;
  onDismiss: () => void;
  onShowAll?: () => void;
  className?: string;
};

function StackRow({
  cluster,
  onSelect,
}: {
  cluster: PinCluster;
  onSelect: (cluster: PinCluster) => void;
}) {
  const hero = projectExperienceHeroFromCluster(cluster);
  const primaryPeer = useGlobeContextPrimaryPeer(cluster.eventId);
  const relationshipMeaning = useRelationshipMeaningLine(primaryPeer);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(cluster)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-card/95 px-3.5 py-3 text-left",
          "shadow-sm ring-1 ring-black/5 backdrop-blur-md active:scale-[0.99]",
        )}
        data-globe-context-stack-item={cluster.eventId}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {hero.title}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {[hero.date, hero.place].filter(Boolean).join(" · ")}
          </p>
          {relationshipMeaning ? (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-foreground/85">
              {relationshipMeaning.line}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {hero.photoCount > 0 ? (
              <span className="rounded-full bg-[var(--rimvio-highlight-green)]/15 px-2 py-0.5 text-[10px] font-semibold">
                📷 {hero.photoCount}
              </span>
            ) : null}
            {hero.videoCount > 0 ? (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                ▶ {hero.videoCount}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

/** P1.5 — nearby context stack after map area tap. */
export function GlobeContextStackPicker({
  clusters,
  visible = true,
  onSelect,
  onDismiss,
  onShowAll,
  className,
}: GlobeContextStackPickerProps) {
  const shown = clusters.slice(0, GLOBE_CONTEXT_STACK_VISIBLE_MAX);
  const overflow = clusters.length - shown.length;

  return (
    <AnimatePresence>
      {visible && clusters.length > 0 ? (
        <motion.div
          key="globe-context-stack"
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "pointer-events-none absolute inset-x-3 z-[22]",
            className,
          )}
          style={{
            bottom:
              "calc(var(--rimvio-globe-ingest-offset) + var(--rimvio-globe-ingest-bar-height) + 0.35rem)",
          }}
          data-globe-context-stack-picker
        >
          <div className="pointer-events-auto mx-auto max-w-lg rounded-[1.35rem] border border-white/90 bg-card/92 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-black/5 backdrop-blur-xl">
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  이 근처 맥락
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {clusters.length}개 · 하나를 골라 보세요
                </p>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground active:scale-95"
                aria-label="닫기"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <ul className="max-h-[min(42vh,280px)] space-y-2 overflow-y-auto overscroll-contain">
              {shown.map((cluster) => (
                <StackRow key={cluster.eventId} cluster={cluster} onSelect={onSelect} />
              ))}
            </ul>
            {overflow > 0 && onShowAll ? (
              <button
                type="button"
                onClick={onShowAll}
                className="mt-2.5 w-full rounded-xl bg-muted/70 py-2.5 text-[13px] font-semibold text-foreground active:bg-muted"
              >
                외 {overflow}개 · 전체 보기
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
