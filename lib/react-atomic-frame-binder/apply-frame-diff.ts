import { frameDiffIsEmpty } from "@/lib/cognitive-streaming-cycle/frame-diff";
import type { FrameDiff } from "@/lib/cognitive-streaming-cycle/types";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  SurfaceUiState,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";
import {
  SURFACE_KEYS,
  type SurfaceKey,
} from "@/lib/react-atomic-frame-binder/types";

function cloneCalendarItem(item: CalendarUiItem): CalendarUiItem {
  return { ...item };
}

function cloneDockItem(item: DockUiItem): DockUiItem {
  return { ...item };
}

function cloneTimelineItem(item: TimelineUiItem): TimelineUiItem {
  return { ...item };
}

function cloneNarrationItem(item: NarrationUiItem): NarrationUiItem {
  return { ...item };
}

export function cloneSurfaceUiState(uiState: SurfaceUiState): SurfaceUiState {
  return {
    CALENDAR: uiState.CALENDAR.map(cloneCalendarItem),
    DOCK: uiState.DOCK.map(cloneDockItem),
    TIMELINE: uiState.TIMELINE.map(cloneTimelineItem),
    NARRATION: uiState.NARRATION.map(cloneNarrationItem),
  };
}

function cloneSurfaceItem(surface: SurfaceKey, item: SurfaceUiState[SurfaceKey][number]) {
  switch (surface) {
    case "CALENDAR":
      return cloneCalendarItem(item as CalendarUiItem);
    case "DOCK":
      return cloneDockItem(item as DockUiItem);
    case "TIMELINE":
      return cloneTimelineItem(item as TimelineUiItem);
    case "NARRATION":
      return cloneNarrationItem(item as NarrationUiItem);
  }
}

function findItemInTarget(target: SurfaceUiState, id: string): { surface: SurfaceKey; item: SurfaceUiState[SurfaceKey][number] } | null {
  for (const surface of SURFACE_KEYS) {
    const item = target[surface].find((entry) => entry.id === id);
    if (item) {
      return { surface, item };
    }
  }
  return null;
}

function removeIdsFromSurface<T extends { id: string }>(items: readonly T[], ids: ReadonlySet<string>): T[] {
  return items.filter((item) => !ids.has(item.id)).map((item) => ({ ...item }));
}

/** Apply frameDiff to previous uiState using target values — no full replacement. */
export function applyFrameDiff(
  previous: SurfaceUiState,
  target: SurfaceUiState,
  diff: FrameDiff
): SurfaceUiState {
  const removed = new Set(diff.removed);
  const changed = new Set([...diff.added, ...diff.updated]);

  if (removed.size === 0 && changed.size === 0) {
    return cloneSurfaceUiState(previous);
  }

  const next = cloneSurfaceUiState(previous);

  for (const surface of SURFACE_KEYS) {
    next[surface] = removeIdsFromSurface(next[surface], removed) as SurfaceUiState[typeof surface];
    next[surface] = removeIdsFromSurface(next[surface], changed) as SurfaceUiState[typeof surface];
  }

  for (const id of changed) {
    const located = findItemInTarget(target, id);
    if (!located) {
      continue;
    }

    const cloned = cloneSurfaceItem(located.surface, located.item);
    const surfaceItems = next[located.surface] as Array<typeof cloned>;

    const targetSurfaceItems = target[located.surface];
    const targetIndex = targetSurfaceItems.findIndex((entry) => entry.id === id);
    const insertAt = Math.min(Math.max(targetIndex, 0), surfaceItems.length);
    surfaceItems.splice(insertAt, 0, cloned);
    next[located.surface] = surfaceItems as SurfaceUiState[typeof located.surface];
  }

  for (const surface of SURFACE_KEYS) {
    const ordered: SurfaceUiState[typeof surface] = [];
    const seen = new Set<string>();

    for (const targetItem of target[surface]) {
      if (removed.has(targetItem.id)) {
        continue;
      }
      const existing = next[surface].find((entry) => entry.id === targetItem.id);
      if (existing && !seen.has(existing.id)) {
        ordered.push(cloneSurfaceItem(surface, existing) as SurfaceUiState[typeof surface][number]);
        seen.add(existing.id);
      }
    }

    for (const item of next[surface]) {
      if (!seen.has(item.id)) {
        ordered.push(cloneSurfaceItem(surface, item) as SurfaceUiState[typeof surface][number]);
        seen.add(item.id);
      }
    }

    next[surface] = ordered;
  }

  return next;
}

export function shouldApplyFrame(frame: { uiCommit: boolean; frameDiff: FrameDiff }): boolean {
  if (!frame.uiCommit) {
    return false;
  }
  if (frameDiffIsEmpty(frame.frameDiff)) {
    return false;
  }
  return true;
}
