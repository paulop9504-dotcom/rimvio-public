import type { PlatformRuntimeVersion } from "@/lib/platform/platform-contract";

export const PLUGIN_CONTRACT_VERSION = 1 as const;

export type PluginType = "surface" | "capability" | "signal" | "loop" | "adapter";

export type PluginPermission =
  | "read_surfaces"
  | "dispatch_capability"
  | "emit_signal"
  | "observe_loop"
  | "register_surface";

/** Permissions plugins must never request. */
export const FORBIDDEN_PLUGIN_PERMISSIONS = [
  "event_store_write",
  "bypass_stability",
  "override_loop_priority",
  "direct_execution_enqueue",
  "truth_log_append",
] as const;

export type ForbiddenPluginPermission = (typeof FORBIDDEN_PLUGIN_PERMISSIONS)[number];

export type PluginIoContract = {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
};

export type PluginLifecycleHooks = {
  onRegister?: string;
  onBootstrap?: string;
  onDispose?: string;
};

export type PluginManifest = {
  contractVersion: typeof PLUGIN_CONTRACT_VERSION;
  id: string;
  name: string;
  version: string;
  runtimeVersion: PlatformRuntimeVersion;
  type: PluginType;
  permissions: readonly PluginPermission[];
  io: PluginIoContract;
  lifecycle?: PluginLifecycleHooks;
  /** Declared capability ids owned by this plugin (`PLUGIN:<id>:<action>`). */
  capabilityIds?: readonly string[];
};

export type PluginCapabilityHandler = (input: Record<string, string>) => {
  capabilityId: string;
  inputs?: Record<string, string>;
  surfaceId?: string;
  eventId?: string;
} | null;

export type RegisteredPlugin = {
  manifest: PluginManifest;
  capabilityHandler?: PluginCapabilityHandler;
  signalEmitter?: (payload: Record<string, string>) => void;
};
