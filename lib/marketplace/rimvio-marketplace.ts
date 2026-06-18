/**
 * Rimvio Marketplace — public ecosystem entry.
 * @see docs/RIMVIO_MARKETPLACE_V1_REPORT.md
 */
export {
  MARKETPLACE_CONTRACT_VERSION,
  type MarketplaceDomain,
  type PublishedCapabilityPackage,
  type SurfaceTemplatePack,
  type MarketplacePluginListing,
  type CapabilityInvocationRecord,
  type InstalledMarketplaceModule,
  type PricingModel,
} from "@/lib/marketplace/marketplace-contract";

export {
  publishCapabilityPackage,
  listPublishedCapabilities,
  getPublishedCapabilityPackage,
  listCapabilityVersions,
  getProviderReputation,
  resetCapabilityMarketRegistryForTests,
} from "@/lib/marketplace/capability-market-registry";

export {
  publishSurfacePack,
  listSurfacePacks,
  getSurfacePack,
  isSurfacePackCompatible,
  resetSurfaceTemplateStoreForTests,
} from "@/lib/marketplace/surface-template-store";

export {
  publishPluginListing,
  discoverPlugins,
  getPluginListing,
  checkPluginStoreCompatibility,
  resetPluginStoreForTests,
} from "@/lib/marketplace/plugin-store";

export {
  installCapabilityPackage,
  installSurfacePack,
  installMarketplacePlugin,
  marketplaceDispatch,
  listInstalledModules,
  type MarketplaceDispatchInput,
  type MarketplaceDispatchResult,
  resetMarketplaceRuntimeForTests,
} from "@/lib/marketplace/marketplace-runtime";

export {
  recordCapabilityInvocation,
  getUsageSummary,
  getProviderRevenue,
  computeCostPerAction,
  attributeRevenue,
  resetMonetizationLayerForTests,
} from "@/lib/marketplace/capability-monetization-layer";

export { selectFairProvider } from "@/lib/marketplace/provider-selection";

export function bootstrapMarketplace(): { ok: true } {
  return { ok: true };
}

import { resetCapabilityMarketRegistryForTests } from "@/lib/marketplace/capability-market-registry";
import { resetSurfaceTemplateStoreForTests } from "@/lib/marketplace/surface-template-store";
import { resetPluginStoreForTests } from "@/lib/marketplace/plugin-store";
import { resetMarketplaceRuntimeForTests } from "@/lib/marketplace/marketplace-runtime";
import { resetMonetizationLayerForTests } from "@/lib/marketplace/capability-monetization-layer";

export function resetMarketplaceForTests(): void {
  resetCapabilityMarketRegistryForTests();
  resetSurfaceTemplateStoreForTests();
  resetPluginStoreForTests();
  resetMarketplaceRuntimeForTests();
  resetMonetizationLayerForTests();
}
