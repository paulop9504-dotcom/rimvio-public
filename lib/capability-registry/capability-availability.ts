import type {
  CapabilityAvailability,
  CapabilityDefinition,
  CapabilityPlatform,
} from "@/lib/capability-registry/capability-contract";

export function detectPlatform(): CapabilityPlatform {
  if (typeof window === "undefined") {
    return "web";
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "web";
}

export function isCapabilityAvailableOnPlatform(
  capability: CapabilityDefinition,
  platform: CapabilityPlatform,
): boolean {
  if (capability.availability === "unavailable") {
    return false;
  }
  return capability.supportedPlatforms.includes(platform);
}

export function filterProvidersForPlatform<T extends { platforms: CapabilityPlatform[] }>(
  providers: readonly T[],
  platform: CapabilityPlatform,
): T[] {
  return providers.filter((provider) => provider.platforms.includes(platform));
}

export function effectiveAvailability(
  capability: CapabilityDefinition,
  platform: CapabilityPlatform,
): CapabilityAvailability {
  if (!isCapabilityAvailableOnPlatform(capability, platform)) {
    return "unavailable";
  }
  const hasProvider = filterProvidersForPlatform(capability.providers, platform).length > 0;
  if (!hasProvider) {
    return "unavailable";
  }
  return capability.availability;
}
