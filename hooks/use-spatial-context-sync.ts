"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSpatialContextFrame } from "@/lib/experience-graph/build-spatial-context-frame";
import { buildSpatialGlobeView } from "@/lib/experience-graph/resolve-place-coordinates";
import type {
  SpatialContextFrame,
  SpatialGlobeView,
  SpatialMediaItem,
} from "@/lib/experience-graph/spatial-media-types";

export type SpatialContextSyncState = {
  items: readonly SpatialMediaItem[];
  selectedId: string | null;
  selectedItem: SpatialMediaItem | null;
  frame: SpatialContextFrame | null;
  globe: SpatialGlobeView | null;
  selectItem: (mediaId: string) => void;
};

/** Client UI state — globe, time ribbon, and environment follow selected media. */
export function useSpatialContextSync(
  items: readonly SpatialMediaItem[],
  initialMediaId?: string | null,
): SpatialContextSyncState {
  const defaultId = initialMediaId ?? items[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (
      initialMediaId &&
      items.some((item) => item.id === initialMediaId) &&
      selectedId !== initialMediaId
    ) {
      setSelectedId(initialMediaId);
      return;
    }
    if (!items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]!.id);
    }
  }, [items, selectedId, initialMediaId]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const frame = useMemo(
    () => (selectedItem ? buildSpatialContextFrame(selectedItem) : null),
    [selectedItem],
  );

  const globe = useMemo(
    () =>
      selectedItem
        ? buildSpatialGlobeView({
            lat: selectedItem.lat,
            lng: selectedItem.lng,
            placeLabel: selectedItem.placeLabel,
          })
        : null,
    [selectedItem],
  );

  const selectItem = useCallback((mediaId: string) => {
    setSelectedId(mediaId);
  }, []);

  return {
    items,
    selectedId,
    selectedItem,
    frame,
    globe,
    selectItem,
  };
}
