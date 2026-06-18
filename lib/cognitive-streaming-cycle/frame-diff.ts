import type { SurfaceUiState } from "@/lib/surface-render-contract/types";
import type { FrameDiff } from "@/lib/cognitive-streaming-cycle/types";

const SURFACES = ["CALENDAR", "DOCK", "TIMELINE", "NARRATION"] as const;

function itemSnapshot(uiState: SurfaceUiState, id: string): string | null {
  for (const surface of SURFACES) {
    const item = uiState[surface].find((entry) => entry.id === id);
    if (item) {
      return JSON.stringify(item);
    }
  }
  return null;
}

function collectIds(uiState: SurfaceUiState | null): string[] {
  if (!uiState) {
    return [];
  }

  const ids = new Set<string>();
  for (const surface of SURFACES) {
    for (const item of uiState[surface]) {
      ids.add(item.id);
    }
  }

  return [...ids].sort((left, right) => left.localeCompare(right));
}

export function computeFrameDiff(
  current: SurfaceUiState,
  previous: SurfaceUiState | null
): FrameDiff {
  const currentIds = collectIds(current);
  const previousIds = collectIds(previous);
  const previousSet = new Set(previousIds);
  const currentSet = new Set(currentIds);

  const added = currentIds.filter((id) => !previousSet.has(id));
  const removed = previousIds.filter((id) => !currentSet.has(id));
  const updated: string[] = [];

  for (const id of currentIds) {
    if (!previousSet.has(id)) {
      continue;
    }
    const currentSnapshot = itemSnapshot(current, id);
    const previousSnapshot = previous ? itemSnapshot(previous, id) : null;
    if (currentSnapshot !== previousSnapshot) {
      updated.push(id);
    }
  }

  return {
    added,
    removed,
    updated: updated.sort((left, right) => left.localeCompare(right)),
  };
}

export function frameDiffIsEmpty(diff: FrameDiff): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0;
}

export function frameDiffIsMeaningful(diff: FrameDiff): boolean {
  return !frameDiffIsEmpty(diff);
}
