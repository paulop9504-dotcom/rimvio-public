# Rimvio Synaptic Layer

Rimvio behaves like **neural synapses**: connections **grow**, **strengthen**, or **shrink** based on use.

## Metaphor → mechanism

| Synapse behavior | Rimvio signal | Effect |
|------------------|---------------|--------|
| **확장 (Expand)** | New active surface path | New edge, small +weight, salience ↑ |
| **강화 (Strengthen)** | Execution success, habit | LTP-like +weight |
| **약화 (Weaken)** | Ignore, fail, cancel | LTD-like −weight |
| **축소 (Prune)** | Dismiss, repeated prune | −weight; removed if below cutoff |

## Storage

- `localStorage` key: `rimvio.synaptic-edges.v1`
- Edge id: `{surfaceId}:{capabilityId}`

## Write paths

- `expandSynapse` — surface collapse selects active primary
- `strengthenSynapse` / `weakenSynapse` / `pruneSynapse` — explicit API
- `applySynapticFromExecution` — execution dispatcher
- `applySynapticFromLearningObservation` — learning ingest

## Read path

- `getSynapticPriorityBoost` → Surface Engine priority score (with learning boost)

## Debug

Console: `[Rimvio Synapse] SYNAPSE_PLASTICITY`, `SYNAPSE_PRUNED`, `SYNAPSE_DECAY`

## UI

- `hooks/use-synaptic-snapshot.ts` — subscribe to synapse store
- `components/surface-composition/synaptic-habit-strip.tsx` — “자주 쓰는 경로” chips on feed
- `use-surface-engine` listens to `rimvio:synapse-updated` so ranking refreshes after plasticity

## Test

`npm run test:synaptic`
