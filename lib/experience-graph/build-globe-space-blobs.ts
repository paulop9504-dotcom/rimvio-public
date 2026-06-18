import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import {
  buildSpatialGlobeView,
  projectLatLngToMapPercent,
  resolvePlaceCoordinates,
} from "@/lib/experience-graph/resolve-place-coordinates";

export type GlobeSpaceBlob = {
  id: string;
  label: string;
  clusterId: string;
  lat: number;
  lng: number;
  pinX: number;
  pinY: number;
  experienceCount: number;
  volumeIds: string[];
};

/** Pure read — group volumes into map blobs for the Rimvio globe hub. */
export function buildGlobeSpaceBlobs(
  volumes: readonly ExperienceVolume[],
): GlobeSpaceBlob[] {
  const byCluster = new Map<
    string,
    { label: string; volumeIds: string[]; placeSample: string }
  >();

  for (const volume of volumes) {
    const clusterId = volume.space.clusterId;
    const label = volume.space.label.trim() || "장소";
    const existing = byCluster.get(clusterId);
    if (existing) {
      existing.volumeIds.push(volume.id);
      if (label.length > existing.label.length) {
        existing.label = label;
      }
    } else {
      byCluster.set(clusterId, {
        label,
        volumeIds: [volume.id],
        placeSample: label,
      });
    }
  }

  return Array.from(byCluster.entries())
    .map(([clusterId, row]) => {
      const coords = resolvePlaceCoordinates(row.placeSample);
      const pin = projectLatLngToMapPercent(coords.lat, coords.lng);
      return {
        id: clusterId,
        label: coords.label || row.label,
        clusterId,
        lat: coords.lat,
        lng: coords.lng,
        pinX: pin.x,
        pinY: pin.y,
        experienceCount: row.volumeIds.length,
        volumeIds: row.volumeIds,
      };
    })
    .sort((a, b) => b.experienceCount - a.experienceCount);
}

export function filterVolumesByCluster(
  volumes: readonly ExperienceVolume[],
  clusterId: string,
): ExperienceVolume[] {
  return volumes.filter((volume) => volume.space.clusterId === clusterId);
}

export function globeViewForBlob(blob: GlobeSpaceBlob) {
  return buildSpatialGlobeView({
    lat: blob.lat,
    lng: blob.lng,
    placeLabel: blob.label,
    zoom: 1.85,
  });
}
