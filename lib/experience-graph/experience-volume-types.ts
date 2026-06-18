import type { ExperienceEventTypeId } from "@/lib/experience-graph/experience-event-type-spec";
import type { RimvioLayerId } from "@/lib/experience-graph/rimvio-layer-stack";
import type { ExperienceLensId } from "@/lib/experience-graph/resolve-experience-lens";
import type { PlanMode } from "@/lib/plan-context/plan-context-types";

/** Layer 2 output — time × space bundle (media spine attaches later). */
export type TimeVolume = {
  startIso: string;
  endIso?: string | null;
  durationHours?: number;
};

export type SpaceVolume = {
  label: string;
  place?: string | null;
  /** Stable cluster key for SpatialEcho edges. */
  clusterId: string;
};

export type ExperiencePeakKind = "space" | "moment" | "dwell";

/** Searchable peak inside a volume — happiest space, romantic moment, etc. */
export type ExperiencePeak = {
  id: string;
  kind: ExperiencePeakKind;
  label: string;
  queryHint: string;
  timeAt?: string;
  spaceLabel?: string;
};

export type ExperienceSearchAxis = "time" | "map" | "space";

export type ExperienceVolume = {
  id: string;
  title: string;
  sourceEventId: string;
  activeLayer: RimvioLayerId;
  time: TimeVolume;
  space: SpaceVolume;
  peaks: ExperiencePeak[];
  planMode?: PlanMode;
  peerDisplayName?: string | null;
  category?: string;
  eventType: ExperienceEventTypeId;
  activeLens: ExperienceLensId;
};

export type ExperienceEdgeKind =
  | "time_continuation"
  | "spatial_echo"
  | "path_rhyme";

export type ExperienceEdge = {
  id: string;
  kind: ExperienceEdgeKind;
  fromVolumeId: string;
  toVolumeId: string;
  label: string;
};

export type ExperienceGraphProjection = {
  volumes: ExperienceVolume[];
  edges: ExperienceEdge[];
  builtAt: string;
};
