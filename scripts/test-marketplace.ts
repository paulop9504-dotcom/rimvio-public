#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { bootstrapRimvioRuntime, resetExtensionRegistryForTests } from "@/lib/platform/rimvio-platform";
import { resetPlatformStateForTests } from "@/lib/platform/platform-state-store";
import {
  bootstrapMarketplace,
  discoverPlugins,
  getUsageSummary,
  installCapabilityPackage,
  installMarketplacePlugin,
  installSurfacePack,
  listCapabilityVersions,
  marketplaceDispatch,
  publishCapabilityPackage,
  publishPluginListing,
  publishSurfacePack,
  resetMarketplaceForTests,
  selectFairProvider,
} from "@/lib/marketplace/rimvio-marketplace";
import {
  FIXTURE_NAVIGATE_KAKAO_PACKAGE,
  FIXTURE_NAVIGATE_NAVER_PACKAGE,
  FIXTURE_PAYMENT_LISTING,
  FIXTURE_PAYMENT_PLUGIN_V1,
  FIXTURE_TRAVEL_SURFACE_PACK,
  FIXTURE_UNSAFE_MARKET_PLUGIN,
} from "@/lib/marketplace/marketplace-test-fixtures";
import { getProviderRevenue } from "@/lib/marketplace/capability-monetization-layer";

function resetAll() {
  resetPlatformStateForTests();
  resetExtensionRegistryForTests();
  resetMarketplaceForTests();
}

function boot() {
  resetAll();
  bootstrapRimvioRuntime({ resetForTests: true });
  bootstrapMarketplace();
}

function testCapabilityVersionConflict() {
  boot();
  assert.equal(installCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE).ok, true);
  const conflict = publishCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE);
  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.reason, "capability_version_conflict");
  }
  installCapabilityPackage({
    ...FIXTURE_NAVIGATE_KAKAO_PACKAGE,
    version: "1.1.0",
    packageId: "pkg-navigate-kakao-1-1",
  });
  assert.deepEqual(listCapabilityVersions("NAVIGATE"), ["1.0.0", "1.1.0"]);
}

function testSurfacePackCompatibility() {
  boot();
  const incompatible = {
    ...FIXTURE_TRAVEL_SURFACE_PACK,
    compatibleRuntime: ["v1"] as const,
  };
  publishSurfacePack(incompatible);
  const installed = installSurfacePack({
    ...incompatible,
    version: "9.9.9",
    packId: "travel-pack-v99",
  });
  assert.equal(installed.ok, true);
}

function testProviderSelectionFairness() {
  boot();
  installCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE);
  installCapabilityPackage(FIXTURE_NAVIGATE_NAVER_PACKAGE);
  const selected = selectFairProvider(
    [
      { providerId: "kakao_navi", unitCost: 0.02 },
      { providerId: "naver_map", unitCost: 0.01 },
    ],
    { costWeight: 0.6, reliabilityWeight: 0.2, speedWeight: 0.2 },
  );
  assert.equal(selected?.providerId, "naver_map");
}

function testMonetizationTracking() {
  boot();
  installCapabilityPackage(FIXTURE_NAVIGATE_NAVER_PACKAGE);
  const result = marketplaceDispatch({
    capabilityId: "NAVIGATE",
    inputs: { destination: "Osaka" },
    publisherId: "naver-corp",
    capabilityVersion: "1.0.0",
  });
  assert.equal(result.ok, true);
  assert.ok(result.invocationId);
  const usage = getUsageSummary("NAVIGATE");
  assert.equal(usage.successfulInvocations, 1);
  assert.ok(usage.totalCostUnits >= 0);
  assert.ok(getProviderRevenue("naver_map") >= 0);
}

function testPluginMarketplaceIsolation() {
  boot();
  const published = publishPluginListing(FIXTURE_PAYMENT_LISTING, {
    "1.0.0": FIXTURE_PAYMENT_PLUGIN_V1,
  });
  assert.equal(published.ok, true);
  const installed = installMarketplacePlugin("listing-payment");
  assert.equal(installed.ok, true);
  const discovered = discoverPlugins({ capabilityId: "PLUGIN:payment:charge" });
  assert.equal(discovered.length, 1);
  const dispatch = marketplaceDispatch({
    capabilityId: "PLUGIN:payment:charge",
    inputs: { amount: "10", currency: "KRW" },
  });
  assert.equal(dispatch.ok, true);
  assert.equal(dispatch.source, "plugin");
}

function testSandboxSecurityValidation() {
  boot();
  const blocked = publishPluginListing(
    {
      ...FIXTURE_PAYMENT_LISTING,
      listingId: "listing-unsafe",
      pluginId: "unsafe-market",
    },
    { "0.0.1": FIXTURE_UNSAFE_MARKET_PLUGIN },
  );
  assert.equal(blocked.ok, false);
}

function testMarketplaceDispatchUsesFairProvider() {
  boot();
  installCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE);
  installCapabilityPackage(FIXTURE_NAVIGATE_NAVER_PACKAGE);
  const result = marketplaceDispatch({
    capabilityId: "NAVIGATE",
    inputs: { destination: "Seoul Station" },
  });
  assert.equal(result.ok, true);
  assert.ok(result.selectedProviderId);
}

testCapabilityVersionConflict();
testSurfacePackCompatibility();
testProviderSelectionFairness();
testMonetizationTracking();
testPluginMarketplaceIsolation();
testSandboxSecurityValidation();
testMarketplaceDispatchUsesFairProvider();

console.log("test-marketplace: ok");
