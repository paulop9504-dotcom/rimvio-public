export const PLATFORM_API_VERSION = 1 as const;

export type PlatformRuntimeVersion = "v1" | "v2";

export type PlatformLoopType =
  | "MORNING_LOOP"
  | "TRANSIT_LOOP"
  | "INTERRUPTION_LOOP"
  | "EVENING_LOOP";

export type PlatformLoadLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PlatformActiveContext = {
  apiVersion: typeof PLATFORM_API_VERSION;
  runtimeVersion: PlatformRuntimeVersion;
  dominantLoop: PlatformLoopType | null;
  loopStabilityScore: number;
  systemLoadLevel: PlatformLoadLevel;
  primarySurfaceId: string | null;
  surfaceCount: number;
  learningPaused: boolean;
  computedAt: string;
};

export type PlatformSurfaceEvent = {
  kind: "surface_frame";
  compositionKey: string;
  primarySurfaceId: string | null;
  secondarySurfaceIds: readonly string[];
  computedAt: string;
};

export type PlatformLoopEvent = {
  kind: "loop_state";
  activeLoop: PlatformLoopType | null;
  confidenceScore: number;
  computedAt: string;
};

export type PlatformStreamEvent = PlatformSurfaceEvent | PlatformLoopEvent;

export type PlatformCapabilityRequest = {
  capabilityId: string;
  inputs?: Record<string, string>;
  surfaceId?: string;
  eventId?: string;
  platform?: "web" | "ios" | "android" | "desktop";
  providerId?: string;
};

export type PlatformDispatchResult = {
  ok: boolean;
  reason?: string;
  executionId?: string;
  capabilityId?: string;
  providerId?: string;
  source: "core" | "plugin";
};

export type SurfaceSubscription = {
  unsubscribe: () => void;
};

export type LoopObserver = {
  unsubscribe: () => void;
};

/** External signal ingress shape (mapped internally by engine bridge). */
export type PlatformSignal = {
  signalId: string;
  kind: string;
  category: "time" | "system" | "behavior" | "location";
  timestamp: string;
  strength: number;
};
