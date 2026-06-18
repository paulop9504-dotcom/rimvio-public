import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";

function averageCoord(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** While lodging focus stage is open — one situational text label, no thumb stack. */
export function applyLodgingMarkerFocusPresentation(input: {
  markers: readonly GlobeLodgingMapMarker[];
  focusStageOpen: boolean;
  situationalLabel: string;
  activeResourceId?: string | null;
}): GlobeLodgingMapMarker[] {
  if (!input.focusStageOpen || input.markers.length === 0) {
    return [...input.markers];
  }

  const activeId = input.activeResourceId?.trim();
  const pool = activeId
    ? input.markers.filter((row) => row.resourceId !== activeId)
    : input.markers;

  if (pool.length === 0) {
    return [];
  }

  const lat = averageCoord(pool.map((row) => row.lat));
  const lng = averageCoord(pool.map((row) => row.lng));
  const lead = pool.find((row) => row.isMain) ?? pool[0]!;

  return [
    {
      ...lead,
      id: "lodging:situational-group",
      label: input.situationalLabel,
      lat,
      lng,
      thumbnailUrl: null,
      isMain: false,
      displayVariant: "situational_label",
    },
  ];
}
