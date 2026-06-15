import type {
  CapabilityDefinition,
  CapabilityPriority,
  CapabilityProviderDefinition,
} from "@/lib/capability-registry/capability-contract";

const PRIORITY_WEIGHT: Record<CapabilityPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
};

export function capabilityPriorityWeight(priority: CapabilityPriority): number {
  return PRIORITY_WEIGHT[priority];
}

export function sortProvidersByPriority(
  providers: readonly CapabilityProviderDefinition[],
): CapabilityProviderDefinition[] {
  return [...providers].sort((left, right) => right.priority - left.priority);
}

export function compareCapabilities(
  left: CapabilityDefinition,
  right: CapabilityDefinition,
): number {
  return capabilityPriorityWeight(right.priority) - capabilityPriorityWeight(left.priority);
}
