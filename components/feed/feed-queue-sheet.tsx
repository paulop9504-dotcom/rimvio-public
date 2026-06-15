"use client";

import { memo, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useFeedQueueSheetSnap } from "@/hooks/use-feed-queue-sheet-snap";
import {
  countFeedQueueRows,
  filterFeedQueueSections,
  flattenFeedQueueSections,
  resolveFeedQueueSections,
  type FeedQueueSectionId,
} from "@/lib/feed/resolve-feed-queue-sections";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import type { RankedSurface, SurfaceType } from "@/lib/surface-engine/surface-contract";
import type {
  DispatchSurfaceAction,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type FeedQueueSheetProps = {
  primary: SurfaceNode | null;
  latent: readonly RankedSurface[];
  onDispatch: DispatchSurfaceAction;
  onAskAi: () => void;
  askAiLabel: string;
  className?: string;
};

type QueueFilter = "all" | SurfaceType;

function asDispatchNode(surface: RankedSurface): SurfaceNode {
  return {
    ...surface,
    layoutSlot: "secondary",
    mfeId: "GenericSurfaceMF",
    capabilityBindings: {
      primary: surface.primaryAction.capabilityId,
      secondary: surface.secondaryActions.map((a) => a.capabilityId),
    },
    uiComponents: [],
  };
}

function QueueRow({
  row,
  onDispatch,
}: {
  row: RankedSurface;
  onDispatch: DispatchSurfaceAction;
}) {
  const visual = surfaceTypeVisual(row.type);
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
        onClick={() => onDispatch(asDispatchNode(row), row.primaryAction)}
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
          {visual.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-foreground">{row.title}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {row.description || row.primaryAction.label}
          </p>
        </div>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/40" strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}

export const FeedQueueSheet = memo(function FeedQueueSheet({
  primary,
  latent,
  onDispatch,
  onAskAi,
  askAiLabel,
  className,
}: FeedQueueSheetProps) {
  const copy = useCopy();
  const queueCopy = copy.feed.queue;
  const [filter, setFilter] = useState<QueueFilter>("all");
  const snap = useFeedQueueSheetSnap(false);
  const draggedRef = useRef(false);

  const sections = useMemo(
    () => resolveFeedQueueSections(primary, latent),
    [primary, latent],
  );

  const allRows = useMemo(() => flattenFeedQueueSections(sections), [sections]);
  const totalCount = useMemo(() => countFeedQueueRows(sections), [sections]);

  const chips = useMemo(() => {
    const types = new Set<SurfaceType>();
    for (const row of allRows) {
      types.add(row.type);
    }
    return ["all" as const, ...Array.from(types)];
  }, [allRows]);

  const filteredSections = useMemo(() => {
    if (filter === "all") {
      return sections;
    }
    return filterFeedQueueSections(sections, (row) => row.type === filter);
  }, [filter, sections]);

  const peekRow = allRows[0] ?? null;

  const collapsedSummary = useMemo(() => {
    if (totalCount === 0) {
      return queueCopy.collapsedEmpty;
    }
    if (peekRow) {
      return queueCopy.collapsedWithPeek(totalCount, peekRow.title);
    }
    return queueCopy.collapsedCount(totalCount);
  }, [peekRow, queueCopy, totalCount]);

  const sectionLabels: Record<FeedQueueSectionId, string> = {
    in_progress: queueCopy.sectionInProgress,
    context_actions: queueCopy.sectionContextActions,
    up_next: queueCopy.sectionUpNext,
  };

  const bindDragHandle = () => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      draggedRef.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
      snap.handlePointerDown(event.clientY);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.preventDefault();
      }
      snap.handlePointerMove(event.clientY);
      if (Math.abs(event.movementY) > 2) {
        draggedRef.current = true;
      }
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      snap.handlePointerUp();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!draggedRef.current) {
        snap.toggle();
      }
    },
    onPointerCancel: () => {
      snap.handlePointerUp();
    },
  });

  const hasVisibleRows = filteredSections.some((section) => section.rows.length > 0);

  return (
    <section
      className={cn(
        "feed-queue-sheet shrink-0 flex flex-col rounded-t-[1.75rem] border-t border-border bg-card shadow-[0_-8px_28px_rgba(6,6,7,0.06)]",
        snap.expanded && "max-h-[min(50vh,400px)] min-h-0",
        className,
      )}
      data-feed-queue-expanded={snap.expanded ? "true" : "false"}
      aria-label={queueCopy.ariaLabel}
    >
      <button
        type="button"
        className="flex w-full shrink-0 flex-col items-center pt-2.5 touch-none"
        aria-expanded={snap.expanded}
        aria-label={snap.expanded ? queueCopy.collapseAria : queueCopy.expandAria}
        {...bindDragHandle()}
      >
        <span className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
      </button>

      <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={snap.toggle}
          aria-expanded={snap.expanded}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {queueCopy.eyebrow}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-foreground">{queueCopy.title}</p>
          {!snap.expanded ? (
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{collapsedSummary}</p>
          ) : primary ? (
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {queueCopy.nowFocus(primary.title)}
            </p>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onAskAi}
          className="shrink-0 rounded-full border border-border bg-muted px-3.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/80"
        >
          {askAiLabel}
        </button>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200",
          snap.expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!snap.expanded}
      >
        {chips.length > 1 ? (
          <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => {
              const label = chip === "all" ? queueCopy.filterAll : surfaceTypeVisual(chip).chipLabel;
              const active = filter === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFilter(chip)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/80 hover:bg-muted/80",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hasVisibleRows ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">{queueCopy.empty}</p>
          ) : (
            filteredSections.map((section) => (
              <div key={section.id} className="mb-3 last:mb-0">
                <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionLabels[section.id]}
                </p>
                <ul>
                  {section.rows.map((row) => (
                    <QueueRow key={row.id} row={row} onDispatch={onDispatch} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={snap.toggle}
        className="mx-auto mb-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={snap.expanded ? queueCopy.collapseAria : queueCopy.expandAria}
      >
        {snap.expanded ? (
          <ChevronDown className="size-5" strokeWidth={2.2} aria-hidden />
        ) : (
          <ChevronUp className="size-5" strokeWidth={2.2} aria-hidden />
        )}
      </button>

      <p className="sr-only">
        <Link href="/search">{queueCopy.searchLink}</Link>
      </p>
    </section>
  );
});
