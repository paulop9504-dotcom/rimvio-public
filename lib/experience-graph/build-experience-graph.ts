import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ExperienceEdge,
  ExperienceGraphProjection,
  ExperienceVolume,
} from "@/lib/experience-graph/experience-volume-types";
import { projectEventToExperienceVolume } from "@/lib/experience-graph/project-event-to-volume";

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function buildEdges(volumes: readonly ExperienceVolume[]): ExperienceEdge[] {
  const edges: ExperienceEdge[] = [];
  const sorted = [...volumes].sort(
    (left, right) =>
      (parseMs(left.time.startIso) ?? 0) - (parseMs(right.time.startIso) ?? 0),
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    for (let other = index + 1; other < sorted.length; other += 1) {
      const next = sorted[other]!;

      if (current.space.clusterId === next.space.clusterId) {
        edges.push({
          id: `edge:spatial:${current.id}:${next.id}`,
          kind: "spatial_echo",
          fromVolumeId: current.id,
          toVolumeId: next.id,
          label: `같은 공간 ${current.space.label}`,
        });
      }

      if (current.category === "travel" && next.category === "travel") {
        edges.push({
          id: `edge:path:${current.id}:${next.id}`,
          kind: "path_rhyme",
          fromVolumeId: current.id,
          toVolumeId: next.id,
          label: "비슷한 여행 궤적",
        });
      }
    }

    const next = sorted[index + 1];
    if (!next) {
      continue;
    }
    const endMs = parseMs(current.time.endIso) ?? parseMs(current.time.startIso);
    const startMs = parseMs(next.time.startIso);
    if (endMs != null && startMs != null && startMs >= endMs - 24 * 3_600_000) {
      edges.push({
        id: `edge:time:${current.id}:${next.id}`,
        kind: "time_continuation",
        fromVolumeId: current.id,
        toVolumeId: next.id,
        label: "이어지는 경험",
      });
    }
  }

  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (seen.has(edge.id)) {
      return false;
    }
    seen.add(edge.id);
    return true;
  });
}

/** Layer 3 — volumes + edges from canonical events. Pure read. */
export function buildExperienceGraphFromEvents(
  events: readonly EventCandidate[],
  now = new Date(),
): ExperienceGraphProjection {
  const volumes = events
    .filter(
      (event) =>
        event.lifecycle !== "archived" &&
        event.lifecycle !== "completed" &&
        Boolean(event.datetime?.trim()),
    )
    .map((event) => projectEventToExperienceVolume(event))
    .filter((volume): volume is ExperienceVolume => volume !== null)
    .sort(
      (left, right) =>
        (parseMs(left.time.startIso) ?? 0) - (parseMs(right.time.startIso) ?? 0),
    );

  return {
    volumes,
    edges: buildEdges(volumes),
    builtAt: now.toISOString(),
  };
}

export function indexExperienceVolumesByEventId(
  graph: ExperienceGraphProjection,
): ReadonlyMap<string, ExperienceVolume> {
  const map = new Map<string, ExperienceVolume>();
  for (const volume of graph.volumes) {
    map.set(volume.sourceEventId, volume);
  }
  return map;
}
