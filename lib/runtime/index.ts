/**
 * Rimvio runtime orchestration — platform bootstrap, realtime ticks, command ingress.
 */
export {
  bootstrapRimvioRuntime,
  publishPlatformFrame,
  dispatchCapability as platformDispatchCapability,
} from "@/lib/platform/rimvio-platform";

export {
  processRealtimeTick,
  buildRealtimeSurfaceFrame,
  readRealtimeState,
} from "@/lib/realtime";

export { routeRimvioCommand } from "@/lib/command-router";
