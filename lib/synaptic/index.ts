export {
  SYNAPSE_CONTRACT_VERSION,
  type SynapseEdge,
  type SynapseSignalKind,
  type SynapseSnapshot,
} from "@/lib/synaptic/synapse-contract";

export { SYNAPSE_UPDATED_EVENT } from "@/lib/synaptic/synapse-engine";

export {
  readSynapseSnapshot,
  resetSynapseStoreForTests,
} from "@/lib/synaptic/synapse-store";

export {
  applySynapticSignal,
  expandSynapse,
  strengthenSynapse,
  weakenSynapse,
  pruneSynapse,
  decaySynapses,
  applySynapticFromExecution,
  applySynapticFromLearningObservation,
  buildSynapseId,
} from "@/lib/synaptic/synapse-engine";

export {
  getSynapticPriorityBoost,
  listStrongSynapses,
  listWeakSynapses,
} from "@/lib/synaptic/synapse-surface-adapter";

export {
  deriveSynapticHabits,
  readSynapticSnapshotSummary,
  type SynapticHabitRow,
} from "@/lib/synaptic/synapse-view-model";
