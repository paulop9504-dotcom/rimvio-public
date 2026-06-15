export const MARKETPLACE_CONTRACT_VERSION = 1 as const;

export type MarketplaceDomain =
  | "travel"
  | "finance"
  | "scheduling"
  | "productivity"
  | "communication"
  | "generic";

export type PricingModel = "free" | "per_action" | "subscription" | "enterprise_pack";

export type CapabilityPricing = {
  model: PricingModel;
  /** Cost units per successful action (deterministic accounting). */
  unitCost: number;
  currency?: string;
};

export type ProviderReputation = {
  providerId: string;
  reliabilityScore: number;
  speedScore: number;
  costScore: number;
  invocationCount: number;
  successCount: number;
};

export type PublishedCapabilityPackage = {
  packageId: string;
  capabilityId: string;
  version: string;
  providerId: string;
  publisherId: string;
  description: string;
  pricing: CapabilityPricing;
  reputation: ProviderReputation;
  publishedAt: string;
};

export type SurfaceTemplate = {
  templateId: string;
  title: string;
  primaryCapabilityId: string;
  surfaceType: string;
  contextRules: readonly string[];
};

export type SurfaceTemplatePack = {
  packId: string;
  name: string;
  version: string;
  domain: MarketplaceDomain;
  templates: readonly SurfaceTemplate[];
  compatibleRuntime: readonly ("v1" | "v2")[];
  publishedAt: string;
};

export type MarketplacePluginListing = {
  listingId: string;
  pluginId: string;
  name: string;
  latestVersion: string;
  versions: readonly string[];
  compatibleRuntime: readonly ("v1" | "v2")[];
  capabilityIds: readonly string[];
  publishedAt: string;
};

export type CapabilityInvocationRecord = {
  invocationId: string;
  capabilityId: string;
  providerId: string;
  publisherId: string;
  costUnits: number;
  success: boolean;
  timestamp: string;
};

export type InstalledMarketplaceModule = {
  moduleId: string;
  kind: "capability" | "surface_pack" | "plugin";
  version: string;
  installedAt: string;
};
