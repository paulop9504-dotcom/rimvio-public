import type { EventCandidateWire } from "@/lib/events/event-candidate";
import { replaceEventCandidatesForTests } from "@/lib/events/event-store";
import { commitEventWireFromApi } from "@/lib/source-of-truth/commit-truth";

/**
 * Server request scope — hydrate in-memory Event SSOT from client mirror.
 * Browser path persists via commit-truth on orchestrate response apply.
 */
export function hydrateEventStoreFromTruthWire(
  wires: readonly EventCandidateWire[] | undefined,
): void {
  if (typeof window !== "undefined") {
    return;
  }

  if (!wires?.length) {
    replaceEventCandidatesForTests([]);
    return;
  }

  replaceEventCandidatesForTests([]);
  for (const wire of wires) {
    commitEventWireFromApi(wire);
  }
}
