import { CAPABILITY_CATALOG } from "@/lib/capability-registry/capability-catalog";
import type { CapabilityDefinition, CapabilityId } from "@/lib/capability-registry/capability-contract";
import { INITIAL_CAPABILITY_IDS } from "@/lib/capability-registry/capability-contract";
import { compareCapabilities } from "@/lib/capability-registry/capability-priority";

export function getCapability(id: CapabilityId): CapabilityDefinition | null {
  return CAPABILITY_CATALOG[id] ?? null;
}

export function listCapabilities(): CapabilityDefinition[] {
  return Object.values(CAPABILITY_CATALOG).sort(compareCapabilities);
}

export function assertCatalogCompleteness(): void {
  for (const id of INITIAL_CAPABILITY_IDS) {
    if (!CAPABILITY_CATALOG[id]) {
      throw new Error(`Missing capability catalog entry: ${id}`);
    }
  }
}
