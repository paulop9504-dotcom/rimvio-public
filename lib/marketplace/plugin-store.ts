import type { MarketplacePluginListing } from "@/lib/marketplace/marketplace-contract";
import type { RegisteredPlugin } from "@/lib/platform/plugin-contract";
import { validateRegisteredPlugin } from "@/lib/platform/plugin-validator";
import { isRuntimeCompatible } from "@/lib/platform/versioned-runtime";
import type { PlatformRuntimeVersion } from "@/lib/platform/platform-contract";

const listings = new Map<string, MarketplacePluginListing>();
const listingVersions = new Map<string, Map<string, RegisteredPlugin>>();

export function publishPluginListing(
  listing: MarketplacePluginListing,
  pluginByVersion: Record<string, RegisteredPlugin>,
): { ok: true } | { ok: false; reason: string } {
  if (listings.has(listing.listingId)) {
    const existing = listings.get(listing.listingId)!;
    if (existing.latestVersion === listing.latestVersion) {
      return { ok: false, reason: "listing_version_conflict" };
    }
  }

  const versionMap = new Map<string, RegisteredPlugin>();
  for (const version of listing.versions) {
    const plugin = pluginByVersion[version];
    if (!plugin) {
      return { ok: false, reason: `missing_plugin_version:${version}` };
    }
    const validation = validateRegisteredPlugin(plugin);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }
    versionMap.set(version, plugin);
  }

  listings.set(listing.listingId, listing);
  listingVersions.set(listing.listingId, versionMap);
  return { ok: true };
}

export function discoverPlugins(filter?: {
  capabilityId?: string;
  runtime?: PlatformRuntimeVersion;
}): readonly MarketplacePluginListing[] {
  return [...listings.values()].filter((listing) => {
    if (filter?.capabilityId && !listing.capabilityIds.includes(filter.capabilityId)) {
      return false;
    }
    if (filter?.runtime) {
      const compatible = listing.compatibleRuntime.some((version) =>
        isRuntimeCompatible(version, filter.runtime!),
      );
      if (!compatible) {
        return false;
      }
    }
    return true;
  });
}

export function getPluginListing(listingId: string): MarketplacePluginListing | null {
  return listings.get(listingId) ?? null;
}

export function resolveListingPlugin(
  listingId: string,
  version?: string,
): RegisteredPlugin | null {
  const listing = listings.get(listingId);
  const versions = listingVersions.get(listingId);
  if (!listing || !versions) {
    return null;
  }
  const targetVersion = version ?? listing.latestVersion;
  return versions.get(targetVersion) ?? null;
}

export function checkPluginStoreCompatibility(
  listingId: string,
  hostRuntime: PlatformRuntimeVersion,
  version?: string,
): { ok: true } | { ok: false; reason: string } {
  const listing = listings.get(listingId);
  if (!listing) {
    return { ok: false, reason: "listing_not_found" };
  }
  const targetVersion = version ?? listing.latestVersion;
  if (!listing.versions.includes(targetVersion)) {
    return { ok: false, reason: "version_not_listed" };
  }
  const compatible = listing.compatibleRuntime.some((row) =>
    isRuntimeCompatible(row, hostRuntime),
  );
  if (!compatible) {
    return { ok: false, reason: "runtime_incompatible" };
  }
  return { ok: true };
}

export function resetPluginStoreForTests(): void {
  listings.clear();
  listingVersions.clear();
}
