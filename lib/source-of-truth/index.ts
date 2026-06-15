/**
 * Rimvio Source of Truth — Event Candidate store (`lib/events/event-store`).
 *
 * Write path (only): `commit-truth.ts` (+ ingest adapters that call it).
 * Read path: projections — schedule / timeline / goal-engine never write life-state.
 *
 * Satellite stores (not life-state SSOT): chat messages (session), goal-roadmap (preferences),
 * user-status (global-brain). They must not override event-backed schedule.
 */

export {
  commitEventUpsert,
  commitEventLifecycle,
  commitEventWireFromApi,
} from "@/lib/source-of-truth/commit-truth";
export { syncLinkRemindersToEventStore } from "@/lib/source-of-truth/sync-link-reminders";

export { readLifeProjections, readSurface } from "@/lib/life-read-model";
export type {
  LifeProjections,
  LifeProjectionsInput,
  SurfaceReadBundle,
  SurfaceReadInput,
} from "@/lib/life-read-model";

export {
  projectScheduleFromTruth,
  projectRemindersFromTruth,
  buildTruthProjections,
} from "@/lib/source-of-truth/project-truth";

export { serializeTruthForMasterContext } from "@/lib/source-of-truth/serialize-for-api";
export {
  resolveMasterContextFromTruth,
  resolveAllRemindersFromTruth,
} from "@/lib/source-of-truth/resolve-master-context";
export { hydrateEventStoreFromTruthWire } from "@/lib/source-of-truth/hydrate-event-store";
export type { RimvioTruthWire } from "@/lib/source-of-truth/types";
