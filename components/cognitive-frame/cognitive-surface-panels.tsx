"use client";

import { memo } from "react";
import { useCommittedUiState } from "@/components/cognitive-frame/atomic-frame-binder";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";
import { cn } from "@/lib/utils";

const CalendarRow = memo(function CalendarRow({ item }: { item: CalendarUiItem }) {
  return (
    <li
      className="rounded-lg border border-white/10 bg-rimvio-surface/5 px-3 py-2"
      data-surface="CALENDAR"
      data-item-id={item.id}
    >
      <p className="text-sm font-medium text-white">{item.title}</p>
      <p className="text-xs text-white/60">
        {new Date(item.timestamp).toLocaleTimeString()} · urgency {item.urgency.toFixed(2)}
      </p>
    </li>
  );
});

const DockRow = memo(function DockRow({ item }: { item: DockUiItem }) {
  return (
    <li
      className="rounded-lg border border-white/10 bg-rimvio-surface/5 px-3 py-2"
      data-surface="DOCK"
      data-item-id={item.id}
    >
      <p className="text-sm font-medium text-white">{item.title}</p>
      <p className="text-xs text-white/60">relevance {item.relevance.toFixed(2)}</p>
    </li>
  );
});

const TimelineRow = memo(function TimelineRow({ item }: { item: TimelineUiItem }) {
  return (
    <li
      className="rounded-lg border border-white/10 bg-rimvio-surface/5 px-3 py-2"
      data-surface="TIMELINE"
      data-item-id={item.id}
    >
      <p className="text-sm font-medium text-white">{item.title}</p>
      <p className="text-xs text-white/60">
        {new Date(item.start).toLocaleTimeString()} – {new Date(item.end).toLocaleTimeString()}
      </p>
    </li>
  );
});

const NarrationRow = memo(function NarrationRow({ item }: { item: NarrationUiItem }) {
  return (
    <li
      className="rounded-lg border border-white/10 bg-rimvio-surface/5 px-3 py-2"
      data-surface="NARRATION"
      data-item-id={item.id}
    >
      <p className="text-sm text-white/90">{item.text}</p>
    </li>
  );
});

export type CognitiveSurfacePanelsProps = {
  className?: string;
};

export const CognitiveSurfacePanels = memo(function CognitiveSurfacePanels({
  className,
}: CognitiveSurfacePanelsProps) {
  const uiState = useCommittedUiState();

  return (
    <div className={cn("grid gap-3", className)}>
      <section data-surface-panel="CALENDAR" aria-label="Calendar">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Calendar</h3>
        <ul className="space-y-2">
          {uiState.CALENDAR.map((item) => (
            <CalendarRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section data-surface-panel="DOCK" aria-label="Dock">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Dock</h3>
        <ul className="space-y-2">
          {uiState.DOCK.map((item) => (
            <DockRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section data-surface-panel="TIMELINE" aria-label="Timeline">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Timeline</h3>
        <ul className="space-y-2">
          {uiState.TIMELINE.map((item) => (
            <TimelineRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section data-surface-panel="NARRATION" aria-label="Narration">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Narration</h3>
        <ul className="space-y-2">
          {uiState.NARRATION.map((item) => (
            <NarrationRow key={item.id} item={item} />
          ))}
        </ul>
      </section>
    </div>
  );
});
