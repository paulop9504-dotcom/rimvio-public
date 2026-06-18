import type { ExperienceEventTypeId } from "@/lib/experience-graph/experience-event-type-spec";
import type { SpatialMediaKind } from "@/lib/experience-graph/spatial-media-types";
import type { WeatherContext } from "@/lib/context-resolver/types";

export type SpacetimePingPayload = {
  id: string;
  title: string;
  caption?: string | null;
  capturedAtIso: string;
  placeLabel: string;
  lat: number;
  lng: number;
  mediaKind: SpatialMediaKind;
  eventType: ExperienceEventTypeId;
  peerDisplayName?: string | null;
  weather?: WeatherContext | null;
};

export type SpacetimePingNavLinks = {
  routeDeeplink: string;
  routeWebHref: string;
  searchDeeplink: string;
};
