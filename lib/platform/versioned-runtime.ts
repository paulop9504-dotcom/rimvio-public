import type { PlatformRuntimeVersion } from "@/lib/platform/platform-contract";
import { PLATFORM_API_VERSION } from "@/lib/platform/platform-contract";

export const RUNTIME_V1 = "v1" as const satisfies PlatformRuntimeVersion;
export const RUNTIME_V2 = "v2" as const satisfies PlatformRuntimeVersion;

export type RuntimeFeatureMatrix = {
  streamSurfaces: boolean;
  observeLoopState: boolean;
  pluginCapabilities: boolean;
  versionedComposition: boolean;
};

const FEATURES: Record<PlatformRuntimeVersion, RuntimeFeatureMatrix> = {
  v1: {
    streamSurfaces: true,
    observeLoopState: true,
    pluginCapabilities: true,
    versionedComposition: false,
  },
  v2: {
    streamSurfaces: true,
    observeLoopState: true,
    pluginCapabilities: true,
    versionedComposition: true,
  },
};

export function resolveRuntimeFeatures(
  version: PlatformRuntimeVersion,
): RuntimeFeatureMatrix {
  return FEATURES[version];
}

export function isRuntimeCompatible(
  pluginRuntime: PlatformRuntimeVersion,
  hostRuntime: PlatformRuntimeVersion,
): boolean {
  if (pluginRuntime === hostRuntime) {
    return true;
  }
  return pluginRuntime === RUNTIME_V1 && hostRuntime === RUNTIME_V2;
}

export function coerceApiVersion(
  requested: number | undefined,
  hostRuntime: PlatformRuntimeVersion,
): typeof PLATFORM_API_VERSION {
  void hostRuntime;
  if (requested === undefined || requested === PLATFORM_API_VERSION) {
    return PLATFORM_API_VERSION;
  }
  if (requested < PLATFORM_API_VERSION) {
    return PLATFORM_API_VERSION;
  }
  return PLATFORM_API_VERSION;
}
