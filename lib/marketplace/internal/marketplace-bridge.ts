/**
 * INTERNAL — sole bridge from marketplace to platform/core.
 */
import { resolveCapabilityProvider } from "@/lib/capability-registry/capability-resolver";
import { getCapability } from "@/lib/capability-registry/capability-registry";
import type { CapabilityId, CapabilityProviderId } from "@/lib/capability-registry/capability-contract";
import {
  registerPlugin,
  type RegisteredPlugin,
} from "@/lib/platform/extension-registry";
import { dispatchCapability } from "@/lib/platform/platform-api";
import type { PlatformCapabilityRequest, PlatformDispatchResult } from "@/lib/platform/platform-contract";
import { assertRuntimeReady, readRuntimeVersion } from "@/lib/platform/rimvio-runtime";
import { readStabilityControlFlags } from "@/lib/stability/stability-state-store";

export function bridgeAssertPlatformReady(): void {
  assertRuntimeReady();
}

export function bridgeReadHostRuntime() {
  return readRuntimeVersion();
}

export function bridgeReadStabilityFlags() {
  return readStabilityControlFlags();
}

export function bridgeResolveCoreProviders(
  capabilityId: string,
  platform?: PlatformCapabilityRequest["platform"],
): { providerId: CapabilityProviderId }[] {
  const capability = getCapability(capabilityId as CapabilityId);
  if (!capability) {
    return [];
  }
  return capability.providers
    .map((row) => {
      const resolved = resolveCapabilityProvider({
        capabilityId: capability.id,
        platform,
        preferredProviderId: row.id,
      });
      return resolved ? { providerId: resolved.providerId } : null;
    })
    .filter((row): row is { providerId: CapabilityProviderId } => row !== null);
}

export function bridgeDispatchCapability(
  request: PlatformCapabilityRequest,
): PlatformDispatchResult {
  return dispatchCapability(request);
}

export function bridgeRegisterPlugin(plugin: RegisteredPlugin) {
  return registerPlugin(plugin);
}
