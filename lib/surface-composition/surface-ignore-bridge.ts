import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import { observeIgnoredPrimaryAction } from "@/lib/learning/learning-engine";
import {
  SURFACE_IGNORE_OBSERVED_EVENT,
  type SurfaceIgnoreObservedDetail,
} from "@/lib/surface-composition/surface-ux-events";
import { weakenSynapse } from "@/lib/synaptic/synapse-engine";

/** Write path: UI ignore timer → learning + synapse + client event. */
export function commitSurfaceIgnoreObservation(detail: SurfaceIgnoreObservedDetail): void {
  observeIgnoredPrimaryAction({
    surfaceId: detail.surfaceId,
    capabilityId: detail.capabilityId as CapabilityId,
    contextSnapshot: { channel: "FEED" },
  });
  weakenSynapse({
    surfaceId: detail.surfaceId,
    capabilityId: detail.capabilityId as CapabilityId,
    reason: "surface_ignore_timer",
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SURFACE_IGNORE_OBSERVED_EVENT, { detail }),
    );
  }
}
