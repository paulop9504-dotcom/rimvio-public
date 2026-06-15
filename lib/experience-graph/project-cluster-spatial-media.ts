import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";

/** Merge cluster volumes into one browsable media timeline. Pure read. */
export function projectClusterSpatialMedia(
  volumes: readonly ExperienceVolume[],
): SpatialMediaItem[] {
  const items = volumes.flatMap((volume) => projectVolumeSpatialMedia(volume));
  return items.sort((a, b) => Date.parse(a.capturedAtIso) - Date.parse(b.capturedAtIso));
}
