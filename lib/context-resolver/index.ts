/**
 * Rimvio Context Resolver — 3-layer separation
 *
 * Layer 1: PersistentEvent (Container) — static what/when/where
 * Layer 2: resolveDynamicContext() — JIT weather/traffic/location/calendar
 * Layer 3: compileTravelAction() — rule engine → show_at + actions
 */
export * from "@/lib/context-resolver/types";
export * from "@/lib/context-resolver/registry";
export * from "@/lib/context-resolver/resolve-context";
export * from "@/lib/context-resolver/leave-time-engine";
export * from "@/lib/context-resolver/event-from-schedule";
export * from "@/lib/context-resolver/compile-travel-action";
export * from "@/lib/context-resolver/format-context-prompt";
export { placeProvider } from "@/lib/context-resolver/providers/place-provider";
export * from "@/lib/context-resolver/discovery/orchestrate-cafe-discovery";
