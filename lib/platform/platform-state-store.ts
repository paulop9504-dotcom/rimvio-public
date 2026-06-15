import type {
  PlatformActiveContext,
  PlatformRuntimeVersion,
  PlatformStreamEvent,
} from "@/lib/platform/platform-contract";
import { PLATFORM_API_VERSION } from "@/lib/platform/platform-contract";

type SurfaceSubscriber = (event: PlatformStreamEvent) => void;
type LoopSubscriber = (event: PlatformStreamEvent) => void;

let bootstrapped = false;
let hostRuntimeVersion: PlatformRuntimeVersion = "v2";
let lastContext: PlatformActiveContext | null = null;
let lastCompositionKey: string | null = null;

const surfaceSubscribers = new Set<SurfaceSubscriber>();
const loopSubscribers = new Set<LoopSubscriber>();

export function isPlatformBootstrapped(): boolean {
  return bootstrapped;
}

export function readHostRuntimeVersion(): PlatformRuntimeVersion {
  return hostRuntimeVersion;
}

export function markPlatformBootstrapped(runtimeVersion: PlatformRuntimeVersion): void {
  bootstrapped = true;
  hostRuntimeVersion = runtimeVersion;
}

export function commitPlatformContext(context: PlatformActiveContext): void {
  lastContext = context;
}

export function readPlatformContext(): PlatformActiveContext | null {
  return lastContext;
}

export function subscribeSurfaceEvents(handler: SurfaceSubscriber): () => void {
  surfaceSubscribers.add(handler);
  return () => surfaceSubscribers.delete(handler);
}

export function subscribeLoopEvents(handler: LoopSubscriber): () => void {
  loopSubscribers.add(handler);
  return () => loopSubscribers.delete(handler);
}

export function publishSurfaceEvent(event: PlatformStreamEvent): void {
  if (event.kind !== "surface_frame") {
    return;
  }
  if (event.compositionKey === lastCompositionKey) {
    return;
  }
  lastCompositionKey = event.compositionKey;
  for (const handler of surfaceSubscribers) {
    handler(event);
  }
}

export function publishLoopEvent(event: PlatformStreamEvent): void {
  if (event.kind !== "loop_state") {
    return;
  }
  for (const handler of loopSubscribers) {
    handler(event);
  }
}

export function buildEmptyPlatformContext(
  runtimeVersion: PlatformRuntimeVersion,
): PlatformActiveContext {
  return {
    apiVersion: PLATFORM_API_VERSION,
    runtimeVersion,
    dominantLoop: null,
    loopStabilityScore: 0,
    systemLoadLevel: "LOW",
    primarySurfaceId: null,
    surfaceCount: 0,
    learningPaused: false,
    computedAt: new Date().toISOString(),
  };
}

export function resetPlatformStateForTests(): void {
  bootstrapped = false;
  hostRuntimeVersion = "v2";
  lastContext = null;
  lastCompositionKey = null;
  surfaceSubscribers.clear();
  loopSubscribers.clear();
}
