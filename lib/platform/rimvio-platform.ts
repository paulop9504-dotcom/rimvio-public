/**
 * Rimvio Behavioral OS Platform — public entry.
 * External developers import from `@/lib/platform/rimvio-platform` only.
 */
export {
  PLATFORM_API_VERSION,
  type PlatformActiveContext,
  type PlatformCapabilityRequest,
  type PlatformDispatchResult,
  type PlatformRuntimeVersion,
  type PlatformStreamEvent,
  type PlatformSignal,
  type SurfaceSubscription,
  type LoopObserver,
} from "@/lib/platform/platform-contract";

export {
  PLUGIN_CONTRACT_VERSION,
  FORBIDDEN_PLUGIN_PERMISSIONS,
  type PluginManifest,
  type PluginType,
  type PluginPermission,
  type RegisteredPlugin,
  type PluginCapabilityHandler,
} from "@/lib/platform/plugin-contract";

export {
  registerPlugin,
  unregisterPlugin,
  listPlugins,
  getPlugin,
  resetExtensionRegistryForTests,
} from "@/lib/platform/extension-registry";
export { validatePluginManifest } from "@/lib/platform/plugin-validator";

export {
  RUNTIME_V1,
  RUNTIME_V2,
  isRuntimeCompatible,
  resolveRuntimeFeatures,
} from "@/lib/platform/versioned-runtime";

export {
  bootstrapRimvioRuntime,
  assertRuntimeReady,
  readRuntimeVersion,
  RIMVIO_BOOTSTRAP_ORDER,
  type RimvioRuntimeHandle,
  type RimvioBootstrapPhase,
} from "@/lib/platform/rimvio-runtime";

export {
  getActiveContext,
  observeLoopState,
  subscribeSurface,
  streamSurfaces,
  dispatchCapability,
  emitPluginSignal,
  publishPlatformFrame,
  readPublicPlatformContext,
} from "@/lib/platform/platform-api";
