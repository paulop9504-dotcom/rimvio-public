import {
  ACTION_INTENT_REGISTRY,
  listActionIntentDefinitions,
} from "@/lib/action-dispatcher/registry";
import type { ActionIntentDefinition } from "@/lib/action-dispatcher/types";

/** Frozen catalog row for docs, tests, and OpenAPI-style handoffs. */
export type ActionRegistryCatalogEntry = {
  id: string;
  label: string;
  description: string;
  params: readonly string[];
  fallback_url: string;
};

export const ACTION_REGISTRY_SCHEMA_VERSION = "action-intent-registry.v1" as const;

export function buildActionRegistryCatalog(): ActionRegistryCatalogEntry[] {
  return listActionIntentDefinitions()
    .map(definitionToCatalogEntry)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function definitionToCatalogEntry(
  definition: ActionIntentDefinition,
): ActionRegistryCatalogEntry {
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    params: [...definition.params],
    fallback_url: definition.fallback_url,
  };
}

export function getRegisteredActionIds(): string[] {
  return Object.keys(ACTION_INTENT_REGISTRY).sort();
}
