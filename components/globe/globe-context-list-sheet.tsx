"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ChevronRight, X } from "lucide-react";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { cn } from "@/lib/utils";

export type GlobeContextListSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
};

function mediaLine(entry: GlobeContextTimelineEntry): string | null {
  const parts: string[] = [];
  if (entry.photoCount > 0) {
    parts.push(`사진 ${entry.photoCount}`);
  }
  if (entry.videoCount > 0) {
    parts.push(`동영상 ${entry.videoCount}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ContextRow({
  entry,
  onSelect,
}: {
  entry: GlobeContextTimelineEntry;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
}) {
  const media = mediaLine(entry);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 text-left",
          "transition-colors active:bg-muted/60",
        )}
        data-globe-context-list-item={entry.eventId}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{entry.title}</p>
          <p className="truncate text-[13px] text-muted-foreground">{entry.place}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {entry.rangeLabel ?? entry.dateLabel ?? "일정 미정"}
            {entry.manual ? " · 직접 만든 맥락" : null}
          </p>
          {media ? (
            <p className="mt-0.5 text-[11px] text-primary/80">{media}</p>
          ) : null}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

function ContextSection({
  label,
  entries,
  emptyLine,
  onSelect,
}: {
  label: string;
  entries: GlobeContextTimelineEntry[];
  emptyLine: string;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
}) {
  return (
    <section className="space-y-2" data-globe-context-section={label}>
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="text-[11px] text-muted-foreground">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-3.5 py-4 text-[12px] text-muted-foreground">
          {emptyLine}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <ContextRow key={entry.eventId} entry={entry} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Past / present / future globe contexts — tap to fly + open pin. */
export function GlobeContextListSheet({
  open,
  onOpenChange,
  onSelect,
}: GlobeContextListSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, [open]);

  const timeline = useMemo(() => {
    void revision;
    return listGlobeContextTimeline(listLifeEventCandidates());
  }, [revision]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="내 맥락"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10051] mx-auto flex w-full max-w-lg max-h-[min(88dvh,680px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-context-list-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
                    <CalendarRange className="size-4 text-primary" aria-hidden />
                    내 맥락
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    예정·진행·지난 맥락 {timeline.total}개
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {timeline.total === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-3.5 py-8 text-center text-[13px] leading-relaxed text-muted-foreground">
                  아직 맥락이 없어요.
                  <br />
                  맥락 만들기로 일정을 박아 보세요.
                </p>
              ) : (
                <>
                  <ContextSection
                    label="예정"
                    entries={timeline.future}
                    emptyLine="다가올 맥락이 없어요"
                    onSelect={onSelect}
                  />
                  <ContextSection
                    label="지금"
                    entries={timeline.present}
                    emptyLine="지금 겹치는 맥락이 없어요"
                    onSelect={onSelect}
                  />
                  <ContextSection
                    label="지난"
                    entries={timeline.past}
                    emptyLine="지난 맥락이 없어요"
                    onSelect={onSelect}
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
