import { resetExtensionRegistryForTests } from "@/lib/platform/extension-registry";
import {
  bridgeAssertCapabilityCatalog,
  readEngineContractSnapshot,
} from "@/lib/platform/internal/engine-bridge";
import {
  buildEmptyPlatformContext,
  commitPlatformContext,
  markPlatformBootstrapped,
  readHostRuntimeVersion,
  isPlatformBootstrapped,
  resetPlatformStateForTests,
} from "@/lib/platform/platform-state-store";
import type { PlatformRuntimeVersion } from "@/lib/platform/platform-contract";
import { RUNTIME_V2 } from "@/lib/platform/versioned-runtime";
import { bridgeResetEnginesForTests } from "@/lib/platform/internal/engine-bridge";

export type RimvioBootstrapPhase =
  | "stability_layer"
  | "surface_engine"
  | "loop_engine"
  | "capability_registry"
  | "learning_layer"
  | "realtime_engine"
  | "extension_registry";

export const RIMVIO_BOOTSTRAP_ORDER: readonly RimvioBootstrapPhase[] = [
  "stability_layer",
  "surface_engine",
  "loop_engine",
  "capability_registry",
  "learning_layer",
  "realtime_engine",
  "extension_registry",
] as const;

export type RimvioRuntimeOptions = {
  runtimeVersion?: PlatformRuntimeVersion;
  resetForTests?: boolean;
};

export type RimvioRuntimeHandle = {
  runtimeVersion: PlatformRuntimeVersion;
  phases: readonly RimvioBootstrapPhase[];
  contractSnapshot: ReturnType<typeof readEngineContractSnapshot>;
  dispose: () => void;
};

function runPhase(phase: RimvioBootstrapPhase, resetForTests: boolean): void {
  switch (phase) {
    case "stability_layer":
      if (resetForTests) {
        bridgeResetEnginesForTests();
      }
      break;
    case "surface_engine": {
      const snapshot = readEngineContractSnapshot();
      if (snapshot.surfaceContractVersion < 1) {
        throw new Error("surface_engine_contract_invalid");
      }
      break;
    }
    case "loop_engine": {
      const snapshot = readEngineContractSnapshot();
      if (snapshot.loopContractVersion < 1) {
        throw new Error("loop_engine_contract_invalid");
      }
      break;
    }
    case "capability_registry":
      bridgeAssertCapabilityCatalog();
      break;
    case "learning_layer":
      break;
    case "realtime_engine":
      break;
    case "extension_registry":
      break;
  }
}

/**
 * Deterministic bootstrap — core engines initialized in fixed order.
 */
export function bootstrapRimvioRuntime(
  options: RimvioRuntimeOptions = {},
): RimvioRuntimeHandle {
  if (options.resetForTests) {
    resetPlatformStateForTests();
    resetExtensionRegistryForTests();
    bridgeResetEnginesForTests();
  }

  const runtimeVersion = options.runtimeVersion ?? RUNTIME_V2;

  const resetForTests = options.resetForTests === true;
  for (const phase of RIMVIO_BOOTSTRAP_ORDER) {
    runPhase(phase, resetForTests);
  }

  markPlatformBootstrapped(runtimeVersion);
  commitPlatformContext(buildEmptyPlatformContext(runtimeVersion));

  return {
    runtimeVersion,
    phases: RIMVIO_BOOTSTRAP_ORDER,
    contractSnapshot: readEngineContractSnapshot(),
    dispose: () => {
      resetPlatformStateForTests();
    },
  };
}

export function assertRuntimeReady(): void {
  if (!isPlatformBootstrapped()) {
    throw new Error("rimvio_runtime_not_bootstrapped");
  }
}

export function readRuntimeVersion(): PlatformRuntimeVersion {
  assertRuntimeReady();
  return readHostRuntimeVersion();
}
