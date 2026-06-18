/**
 * Materialized pin projection index — spatial read model (not truth).
 * @see docs/RFC_UNIVERSAL_PIN_SYSTEM.md § Scale
 */

import type { PinDomainId } from "@/lib/globe/pin-domain-registry";
import type { GlobeContextVisibility } from "@/lib/globe/globe-context-visibility";
import type { PinScope } from "@/lib/globe/pin-entity";
import type { PinClusterOrigin } from "@/lib/globe/pin-cluster-types";

export type PinProjectionBbox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type PinProjectionIndexRecord = {
  eventId: string;
  pinId: string;
  lat: number;
  lng: number;
  placeLabel: string;
  title: string;
  domainId: PinDomainId;
  scope: PinScope;
  visibility: GlobeContextVisibility;
  startedAtIso: string | null;
  cellKey: string;
  origin: PinClusterOrigin;
  photoCount: number;
  videoCount: number;
  authorUserId?: string | null;
  authorDisplayName?: string | null;
};

export type PinProjectionIndexSlice = {
  records: PinProjectionIndexRecord[];
  bbox: PinProjectionBbox | null;
  total: number;
};

export type GlobePinsIndexResponse = {
  personal: PinProjectionIndexRecord[];
  external: PinProjectionIndexRecord[];
  bbox: PinProjectionBbox | null;
  source: "index";
};
