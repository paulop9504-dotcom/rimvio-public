import {
  detectPlatform,
  effectiveAvailability,
  filterProvidersForPlatform,
} from "@/lib/capability-registry/capability-availability";
import type {
  CapabilityDispatchRequest,
  CapabilityId,
  CapabilityProviderId,
  ResolvedCapabilityProvider,
} from "@/lib/capability-registry/capability-contract";
import { getCapability } from "@/lib/capability-registry/capability-registry";
import { sortProvidersByPriority } from "@/lib/capability-registry/capability-priority";

export type ResolveProviderInput = {
  capabilityId: CapabilityId;
  platform?: CapabilityDispatchRequest["platform"];
  preferredProviderId?: CapabilityProviderId;
};

/**
 * Select provider for a capability — only Capability Registry may do this.
 */
export function resolveCapabilityProvider(
  input: ResolveProviderInput,
): ResolvedCapabilityProvider | null {
  const capability = getCapability(input.capabilityId);
  if (!capability) {
    return null;
  }

  const platform = input.platform ?? detectPlatform();
  if (effectiveAvailability(capability, platform) === "unavailable") {
    return null;
  }

  const eligible = sortProvidersByPriority(
    filterProvidersForPlatform(capability.providers, platform),
  );
  if (eligible.length === 0) {
    return null;
  }

  const chosen =
    (input.preferredProviderId
      ? eligible.find((row) => row.id === input.preferredProviderId)
      : null) ?? eligible[0]!;

  return {
    capabilityId: capability.id,
    providerId: chosen.id,
    providerName: chosen.name,
  };
}
