/**
 * PinEntity ↔ PinCluster — Globe renderer stays on PinCluster (P1 adapter).
 */

import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { PinEntity } from "@/lib/globe/pin-entity";
import { pinEntityToCluster } from "@/lib/globe/project-pin-entity";

export function pinEntitiesToClusters(
  entities: readonly PinEntity[],
): PinCluster[] {
  return entities.map(pinEntityToCluster);
}

export function findPinEntityByEventId(
  entities: readonly PinEntity[],
  eventId: string | null | undefined,
): PinEntity | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  return entities.find((row) => row.eventId === key) ?? null;
}

export function findPinEntityByPinId(
  entities: readonly PinEntity[],
  pinId: string | null | undefined,
): PinEntity | null {
  const key = pinId?.trim();
  if (!key) {
    return null;
  }
  return entities.find((row) => row.id === key) ?? null;
}
