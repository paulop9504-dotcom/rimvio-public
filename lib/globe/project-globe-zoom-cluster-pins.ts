import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";

const CLUSTER_LEVELS = new Set<GlobeDetailLevel>(["space", "region", "city"]);
/** Far zoom — lone context dots clutter the map; show clusters only. */
const HIDE_SINGLETON_LEVELS = new Set<GlobeDetailLevel>(["space", "region"]);

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterRadiusMeters(detailLevel: GlobeDetailLevel): number {
  if (detailLevel === "space") {
    return 320_000;
  }
  if (detailLevel === "region") {
    return 85_000;
  }
  return 12_000;
}

/** Zoomed-out map — merge nearby context pins into count badges. */
export function projectGlobeZoomClusterPins(
  pins: readonly ClassifiedGlobePin[],
  detailLevel: GlobeDetailLevel,
): ClassifiedGlobePin[] {
  const candidates = pins.filter(
    (pin) => pin.pinShape !== "viewer" && pin.sourceEventId?.trim(),
  );
  if (!CLUSTER_LEVELS.has(detailLevel)) {
    return [...pins];
  }

  if (candidates.length <= 1) {
    if (HIDE_SINGLETON_LEVELS.has(detailLevel)) {
      return pins.filter((pin) => pin.pinShape === "viewer");
    }
    return [...pins];
  }

  const radiusM = clusterRadiusMeters(detailLevel);
  const groups: ClassifiedGlobePin[][] = [];
  const used = new Set<string>();

  for (const pin of candidates) {
    if (used.has(pin.id)) {
      continue;
    }
    const group = [pin];
    used.add(pin.id);
    for (const other of candidates) {
      if (used.has(other.id)) {
        continue;
      }
      if (
        haversineMeters(pin.lat, pin.lng, other.lat, other.lng) <= radiusM
      ) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }

  const clustered: ClassifiedGlobePin[] = pins
    .filter((pin) => pin.pinShape === "viewer")
    .map((pin) => pin);

  for (const group of groups) {
    if (group.length === 1) {
      if (HIDE_SINGLETON_LEVELS.has(detailLevel)) {
        continue;
      }
      clustered.push(group[0]!);
      continue;
    }

    const lat =
      group.reduce((sum, row) => sum + row.lat, 0) / group.length;
    const lng =
      group.reduce((sum, row) => sum + row.lng, 0) / group.length;
    const map = projectLatLngToMapPercent(lat, lng);
    const lead = group[0]!;

    clustered.push({
      id: `cluster:${group.map((row) => row.id).sort().join("|")}`,
      kind: lead.kind,
      label: `${group.length}개 맥락`,
      lat,
      lng,
      pinX: map.x,
      pinY: map.y,
      sourceEventId: lead.sourceEventId ?? null,
      emphasis: "primary",
      pinShape: "cluster",
      slot: {
        experienceTitle: `${group.length}`,
        photoCount: group.reduce(
          (sum, row) => sum + (row.slot?.photoCount ?? 0),
          0,
        ),
        videoCount: group.reduce(
          (sum, row) => sum + (row.slot?.videoCount ?? 0),
          0,
        ),
      },
    });
  }

  return clustered;
}
