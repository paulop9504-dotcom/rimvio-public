import {
  listPublishedCapabilities,
  publishCapabilityPackage,
  recordProviderOutcome,
} from "@/lib/marketplace/capability-market-registry";
import { recordCapabilityInvocation } from "@/lib/marketplace/capability-monetization-layer";
import type {
  InstalledMarketplaceModule,
  PublishedCapabilityPackage,
  SurfaceTemplatePack,
} from "@/lib/marketplace/marketplace-contract";
import {
  bridgeAssertPlatformReady,
  bridgeDispatchCapability,
  bridgeReadHostRuntime,
  bridgeReadStabilityFlags,
  bridgeRegisterPlugin,
  bridgeResolveCoreProviders,
} from "@/lib/marketplace/internal/marketplace-bridge";
import { selectFairProvider, type ProviderCandidate } from "@/lib/marketplace/provider-selection";
import {
  checkPluginStoreCompatibility,
  getPluginListing,
  resolveListingPlugin,
} from "@/lib/marketplace/plugin-store";
import {
  isSurfacePackCompatible,
  getSurfacePack,
  publishSurfacePack,
} from "@/lib/marketplace/surface-template-store";
import type { PlatformCapabilityRequest, PlatformDispatchResult } from "@/lib/platform/platform-contract";
import { validateRegisteredPlugin } from "@/lib/platform/plugin-validator";
import type { RegisteredPlugin } from "@/lib/platform/plugin-contract";

const installed = new Map<string, InstalledMarketplaceModule>();

export type MarketplaceDispatchInput = PlatformCapabilityRequest & {
  capabilityVersion?: string;
  publisherId?: string;
};

export type MarketplaceDispatchResult = PlatformDispatchResult & {
  selectedProviderId?: string;
  invocationId?: string;
};

function sandboxAllowsInstall(): { ok: true } | { ok: false; reason: string } {
  const flags = bridgeReadStabilityFlags();
  if (flags.staticPrimaryOnly) {
    return { ok: false, reason: "marketplace_frozen_under_load" };
  }
  return { ok: true };
}

export function installCapabilityPackage(
  pkg: PublishedCapabilityPackage,
): { ok: true; moduleId: string } | { ok: false; reason: string } {
  bridgeAssertPlatformReady();
  const gate = sandboxAllowsInstall();
  if (!gate.ok) {
    return gate;
  }

  const published = publishCapabilityPackage(pkg);
  if (!published.ok) {
    return published;
  }

  const moduleId = `cap:${pkg.capabilityId}:${pkg.version}:${pkg.providerId}`;
  installed.set(moduleId, {
    moduleId,
    kind: "capability",
    version: pkg.version,
    installedAt: new Date().toISOString(),
  });
  return { ok: true, moduleId };
}

export function installSurfacePack(
  pack: SurfaceTemplatePack,
): { ok: true; moduleId: string } | { ok: false; reason: string } {
  bridgeAssertPlatformReady();
  const gate = sandboxAllowsInstall();
  if (!gate.ok) {
    return gate;
  }

  const hostRuntime = bridgeReadHostRuntime();
  if (!isSurfacePackCompatible(pack, hostRuntime)) {
    return { ok: false, reason: "surface_pack_incompatible" };
  }

  const published = publishSurfacePack(pack);
  if (!published.ok) {
    return published;
  }

  const moduleId = `surface:${pack.packId}:${pack.version}`;
  installed.set(moduleId, {
    moduleId,
    kind: "surface_pack",
    version: pack.version,
    installedAt: new Date().toISOString(),
  });
  return { ok: true, moduleId };
}

export function installMarketplacePlugin(
  listingId: string,
  version?: string,
): { ok: true; moduleId: string } | { ok: false; reason: string } {
  bridgeAssertPlatformReady();
  const gate = sandboxAllowsInstall();
  if (!gate.ok) {
    return gate;
  }

  const hostRuntime = bridgeReadHostRuntime();
  const compatibility = checkPluginStoreCompatibility(listingId, hostRuntime, version);
  if (!compatibility.ok) {
    return compatibility;
  }

  const plugin = resolveListingPlugin(listingId, version);
  if (!plugin) {
    return { ok: false, reason: "plugin_not_found" };
  }

  const validation = validateRegisteredPlugin(plugin);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const registered = bridgeRegisterPlugin(plugin);
  if (!registered.ok) {
    return { ok: false, reason: registered.reason };
  }

  const listing = getPluginListing(listingId)!;
  const moduleId = `plugin:${listing.pluginId}:${version ?? listing.latestVersion}`;
  installed.set(moduleId, {
    moduleId,
    kind: "plugin",
    version: version ?? listing.latestVersion,
    installedAt: new Date().toISOString(),
  });
  return { ok: true, moduleId };
}

export function marketplaceDispatch(
  input: MarketplaceDispatchInput,
): MarketplaceDispatchResult {
  bridgeAssertPlatformReady();
  const started = performance.now();

  const published = input.capabilityVersion
    ? listPublishedCapabilities(input.capabilityId).find(
        (row) => row.version === input.capabilityVersion,
      )
    : listPublishedCapabilities(input.capabilityId)[0];

  const coreCandidates = bridgeResolveCoreProviders(input.capabilityId, input.platform);
  const marketCandidates: ProviderCandidate[] = published
    ? [{ providerId: published.providerId, unitCost: published.pricing.unitCost }]
    : [];

  const merged = [...marketCandidates, ...coreCandidates.map((row) => ({ providerId: row.providerId }))];
  const selected = selectFairProvider(merged);
  const providerId = selected?.providerId;

  const result = bridgeDispatchCapability({
    ...input,
    providerId: (providerId as PlatformCapabilityRequest["providerId"]) ?? input.providerId,
  });

  const invocation = recordCapabilityInvocation({
    capabilityId: input.capabilityId,
    providerId: providerId ?? "unknown",
    publisherId: input.publisherId ?? published?.publisherId ?? "core",
    success: result.ok,
    version: input.capabilityVersion,
  });

  if (providerId) {
    recordProviderOutcome(providerId, {
      success: result.ok,
      latencyMs: performance.now() - started,
      costUnits: invocation.costUnits,
    });
  }

  return {
    ...result,
    selectedProviderId: providerId,
    invocationId: invocation.invocationId,
  };
}

export function listInstalledModules(): readonly InstalledMarketplaceModule[] {
  return [...installed.values()];
}

export function getInstalledSurfacePack(moduleId: string): SurfaceTemplatePack | null {
  const module = installed.get(moduleId);
  if (!module || module.kind !== "surface_pack") {
    return null;
  }
  const [, packId, version] = moduleId.split(":");
  if (!packId || !version) {
    return null;
  }
  return getSurfacePack(packId, version);
}

export function resetMarketplaceRuntimeForTests(): void {
  installed.clear();
}
