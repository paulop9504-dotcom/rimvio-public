/**
 * Capability Registry v1 — canonical actions; providers are implementation details.
 * @see docs/RIMVIO_CAPABILITY_REGISTRY_V1_REPORT.md
 */
export {
  CAPABILITY_CONTRACT_VERSION,
  INITIAL_CAPABILITY_IDS,
  type CapabilityAvailability,
  type CapabilityCategory,
  type CapabilityDefinition,
  type CapabilityDispatchRequest,
  type CapabilityDispatchResult,
  type CapabilityExecutionMode,
  type CapabilityExecutionPayload,
  type CapabilityId,
  type CapabilityInputSchema,
  type CapabilityOutputSchema,
  type CapabilityPlatform,
  type CapabilityPriority,
  type CapabilityProviderDefinition,
  type CapabilityProviderId,
  type ResolvedCapabilityProvider,
} from "@/lib/capability-registry/capability-contract";

export { getCapability, listCapabilities, assertCatalogCompleteness } from "@/lib/capability-registry/capability-registry";
export { CAPABILITY_CATALOG } from "@/lib/capability-registry/capability-catalog";
export { dispatchCapability } from "@/lib/capability-registry/capability-dispatcher";
export { resolveCapabilityProvider } from "@/lib/capability-registry/capability-resolver";
export {
  detectPlatform,
  effectiveAvailability,
  isCapabilityAvailableOnPlatform,
} from "@/lib/capability-registry/capability-availability";
export {
  FIXTURE_ALARM,
  FIXTURE_BOOK_FLIGHT,
  FIXTURE_NAVIGATE_OSAKA,
} from "@/lib/capability-registry/capability-test-fixtures";
export { mapLegacySurfaceIntent } from "@/lib/capability-registry/map-legacy-surface-intent";
