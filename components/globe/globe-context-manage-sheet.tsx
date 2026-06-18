"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, ListChecks, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { deleteGlobeContexts } from "@/lib/globe/delete-globe-context";
import {
  listGlobeManageContexts,
  summarizeGlobeManageContexts,
  type GlobeManageContextEntry,
} from "@/lib/globe/list-globe-manage-contexts";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import { cn } from "@/lib/utils";

export type GlobeContextManageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenContext?: (entry: GlobeManageContextEntry) => void;
  onDeleted?: (eventIds: string[]) => void;
};

function mediaLine(entry: GlobeManageContextEntry): string | null {
  const parts: string[] = [];
  if (entry.photoCount > 0) {
    parts.push(`사진 ${entry.photoCount}`);
  }
  if (entry.videoCount > 0) {
    parts.push(`동영상 ${entry.videoCount}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function GlobeContextManageSheet({
  open,
  onOpenChange,
  onOpenContext,
  onDeleted,
}: GlobeContextManageSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
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

  const events = useMemo(() => {
    void revision;
    return listLifeEventCandidates();
  }, [revision]);
  const eventsById = useMemo(() => indexEventsById(events), [events]);
  const { graph } = useExperienceGraph(eventsById);

  const entries = useMemo(
    () =>
      listGlobeManageContexts({
        events,
        volumes: graph.volumes,
        eventsById,
      }),
    [events, graph.volumes, eventsById],
  );

  const summary = useMemo(
    () => summarizeGlobeManageContexts(entries),
    [entries],
  );

  const allSelected = entries.length > 0 && selected.size === entries.length;
  const someSelected = selected.size > 0;

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

  const toggleOne = (eventId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(entries.map((entry) => entry.eventId)));
  };

  const handleDelete = async () => {
    if (!someSelected || deleting) {
      return;
    }
    const ids = [...selected];
    const confirmed = window.confirm(
      ids.length === 1
        ? "선택한 맥락을 지구본에서 지울까요?\n핀과 목록에서 사라지며, 사진·기록은 기기에 남아요."
        : `선택한 맥락 ${ids.length}개를 지구본에서 지울까요?\n핀과 목록에서 사라지며, 사진·기록은 기기에 남아요.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      const { deleted } = deleteGlobeContexts(ids);
      if (deleted === 0) {
        toast.error("맥락을 지우지 못했어요");
        return;
      }
      toast.success(
        deleted === 1
          ? "맥락 1개를 지구본에서 지웠어요"
          : `맥락 ${deleted}개를 지구본에서 지웠어요`,
      );
      onDeleted?.(ids);
      setSelected(new Set());
      if (entries.length - deleted <= 0) {
        onOpenChange(false);
      }
    } finally {
      setDeleting(false);
    }
  };

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
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="맥락 관리"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10051] mx-auto flex w-full max-w-lg max-h-[min(88dvh,680px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-context-manage-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
                    <ListChecks className="size-4 text-primary" aria-hidden />
                    맥락 관리
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    전체 {summary.total}개 · 지구본 {summary.onGlobe}
                    {summary.offGlobe > 0 ? ` · 일정·보관 ${summary.offGlobe}` : ""}
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

              {entries.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-primary"
                >
                  {allSelected ? (
                    <CheckSquare className="size-4" aria-hidden />
                  ) : (
                    <Square className="size-4" aria-hidden />
                  )}
                  {allSelected ? "전체 해제" : "전체 선택"}
                  <span className="font-normal text-muted-foreground">
                    · {entries.length}개
                  </span>
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {entries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-3.5 py-8 text-center text-[13px] leading-relaxed text-muted-foreground">
                  맥락·일정이 없어요.
                </p>
              ) : (
                <ul className="space-y-2 pb-2">
                  {entries.map((entry) => {
                    const checked = selected.has(entry.eventId);
                    const media = mediaLine(entry);
                    return (
                      <li key={entry.eventId}>
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border px-2 py-2",
                            checked
                              ? "border-primary/35 bg-primary/5"
                              : "border-border bg-card",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleOne(entry.eventId)}
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl active:bg-muted/60"
                            aria-pressed={checked}
                            aria-label={checked ? "선택 해제" : "선택"}
                          >
                            {checked ? (
                              <CheckSquare className="size-5 text-primary" aria-hidden />
                            ) : (
                              <Square className="size-5 text-muted-foreground" aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenContext?.(entry)}
                            className="min-w-0 flex-1 rounded-xl px-1 py-1 text-left active:bg-muted/50"
                          >
                            <p className="truncate text-[15px] font-semibold text-foreground">
                              {entry.title}
                              <span
                                className={cn(
                                  "ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold align-middle",
                                  entry.onGlobe
                                    ? "bg-primary/10 text-primary"
                                    : entry.manageKind === "archived"
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                )}
                              >
                                {entry.kindLabel}
                              </span>
                            </p>
                            <p className="truncate text-[13px] text-muted-foreground">
                              {entry.place}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {entry.dateLabel ?? "일정 미정"}
                              {media ? ` · ${media}` : null}
                            </p>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={!someSelected || deleting}
                onClick={() => void handleDelete()}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-semibold",
                  someSelected
                    ? "bg-destructive text-destructive-foreground active:scale-[0.99]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Trash2 className="size-4" aria-hidden />
                {deleting
                  ? "지우는 중…"
                  : someSelected
                    ? `선택 삭제 · ${selected.size}개`
                    : "맥락을 선택하세요"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
