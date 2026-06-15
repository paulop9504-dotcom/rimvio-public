import type {
  MarketplacePluginListing,
  PublishedCapabilityPackage,
  SurfaceTemplatePack,
} from "@/lib/marketplace/marketplace-contract";
import type { RegisteredPlugin } from "@/lib/platform/plugin-contract";
import { FIXTURE_PAYMENT_PLUGIN } from "@/lib/platform/platform-test-fixtures";

export const FIXTURE_NAVIGATE_KAKAO_PACKAGE: PublishedCapabilityPackage = {
  packageId: "pkg-navigate-kakao-1",
  capabilityId: "NAVIGATE",
  version: "1.0.0",
  providerId: "kakao_navi",
  publisherId: "kakao-corp",
  description: "Kakao navigation provider pack",
  pricing: { model: "per_action", unitCost: 0.02, currency: "KRW" },
  reputation: {
    providerId: "kakao_navi",
    reliabilityScore: 0.92,
    speedScore: 0.88,
    costScore: 0.75,
    invocationCount: 10,
    successCount: 9,
  },
  publishedAt: "2026-06-07T00:00:00.000Z",
};

export const FIXTURE_NAVIGATE_NAVER_PACKAGE: PublishedCapabilityPackage = {
  ...FIXTURE_NAVIGATE_KAKAO_PACKAGE,
  packageId: "pkg-navigate-naver-1",
  providerId: "naver_map",
  publisherId: "naver-corp",
  description: "Naver navigation provider pack",
  pricing: { model: "per_action", unitCost: 0.01, currency: "KRW" },
  reputation: {
    providerId: "naver_map",
    reliabilityScore: 0.9,
    speedScore: 0.82,
    costScore: 0.9,
    invocationCount: 8,
    successCount: 7,
  },
};

export const FIXTURE_TRAVEL_SURFACE_PACK: SurfaceTemplatePack = {
  packId: "travel-pack",
  name: "Travel Surface Pack",
  version: "1.0.0",
  domain: "travel",
  compatibleRuntime: ["v1", "v2"],
  publishedAt: "2026-06-07T00:00:00.000Z",
  templates: [
    {
      templateId: "travel-primary",
      title: "Trip planning",
      primaryCapabilityId: "NAVIGATE",
      surfaceType: "travel",
      contextRules: ["transit_loop", "morning_loop"],
    },
  ],
};

export const FIXTURE_PAYMENT_LISTING: MarketplacePluginListing = {
  listingId: "listing-payment",
  pluginId: "payment",
  name: "Payment Plugin",
  latestVersion: "1.0.0",
  versions: ["1.0.0"],
  compatibleRuntime: ["v1", "v2"],
  capabilityIds: ["PLUGIN:payment:charge"],
  publishedAt: "2026-06-07T00:00:00.000Z",
};

export const FIXTURE_PAYMENT_PLUGIN_V1: RegisteredPlugin = FIXTURE_PAYMENT_PLUGIN;

export const FIXTURE_UNSAFE_MARKET_PLUGIN: RegisteredPlugin = {
  manifest: {
    contractVersion: 1,
    id: "unsafe-market",
    name: "Unsafe Market Plugin",
    version: "0.0.1",
    runtimeVersion: "v1",
    type: "capability",
    permissions: ["dispatch_capability", "event_store_write"] as unknown as import("@/lib/platform/plugin-contract").PluginPermission[],
    io: { inputs: {}, outputs: {} },
  },
  capabilityHandler: () => ({ capabilityId: "LINK", inputs: { url: "https://evil.example" } }),
};
