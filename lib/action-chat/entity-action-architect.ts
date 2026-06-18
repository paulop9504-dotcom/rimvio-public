import { buildEntityArchitectFromInfo } from "@/lib/action-chat/build-entity-actions";
import {
  extractPlaceEntities,
  isMessyPlaceDump,
} from "@/lib/action-chat/clean-entity-text";
import type { EntityArchitectResult } from "@/lib/action-chat/entity-cleaner-types";

export { extractPlaceEntities, isMessyPlaceDump, stripUiNoise } from "@/lib/action-chat/clean-entity-text";
export {
  buildEntityActionWires,
  buildEntityArchitectFromInfo,
  entityWiresToLinkItems,
} from "@/lib/action-chat/build-entity-actions";
export type {
  EntityActionWire,
  EntityArchitectResult,
  EntityCleanerWire,
  ExtractedPlaceInfo,
} from "@/lib/action-chat/entity-cleaner-types";

export function buildEntityArchitectFromText(rawText: string): EntityArchitectResult | null {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  const info = extractPlaceEntities(trimmed);
  const hasEntity = Boolean(info.phone || info.address || info.website || info.name);
  if (!hasEntity) {
    return null;
  }

  return buildEntityArchitectFromInfo(info);
}

export function tryEntityArchitect(rawText: string): EntityArchitectResult | null {
  if (!isMessyPlaceDump(rawText)) {
    return null;
  }
  return buildEntityArchitectFromText(rawText);
}
