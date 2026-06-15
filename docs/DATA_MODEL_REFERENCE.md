# Rimvio Data Model Reference

Companion to [`RIMVIO_SYSTEM_AUDIT.md`](./RIMVIO_SYSTEM_AUDIT.md) §9–12.  
Canonical re-exports: `lib/data-model/index.ts`.

---

## 9. Database Schema (Supabase)

Migrations under `supabase/migrations/` (001–031). Grouped by product concern.

### Core product

| Migration | Objects |
|-----------|---------|
| `002_links.sql` | `links` — saved URLs, metadata |
| `001_link_actions.sql` | `link_actions` — executable actions per link |
| `003_user_action_bins.sql` | `user_action_bins` — grouped actions |
| `005_link_visual.sql` | Visual enrichment columns |
| `008_user_action_metadata.sql` | Per-user action metadata |

### Personalization (click learning)

| Object | Columns (summary) |
|--------|-------------------|
| `user_action_events` | session_id, link_id, action_key, action_family, domain_family, event ∈ impression/click/skip |
| `user_link_states` | lifecycle_state ∈ saved/opened/compared/decided/done |
| `user_recent_action_profile` | recent_clicks JSON (max 10), family_counts, domain_affinity |
| RPC `record_personalization_click` | Atomic append + profile recompute |
| RPC `merge_guest_personalization` | Guest → user merge on login |

### Containers (cloud, parallel track)

| Object | Notes |
|--------|-------|
| `containers` | goal, title, status, knowledge jsonb, kind |
| `container_events` | type + data jsonb — **not** EventCandidate SSOT |

### Place & locate

| Migration | Objects |
|-----------|---------|
| `009_place_locate_cache.sql` | Locate cache |
| `011_place_corrections.sql` | `place_corrections` — user vs AI location outcomes |

### Social / auth

`013_peer_chat` … `031_peer_message_images` — peer DM, profiles, friend graph, RLS fixes.

### Analytics

`004_analytics_events` — product analytics stream.

### What is NOT in Postgres

- **EventCandidate life-state** — `localStorage` / memory `rimvio-event-candidates.v1` via `lib/events/event-store.ts`
- **Session navigate intent** — `rimvio-session-intent.v1`
- **Learning rollup** — `rimvio.learning-rollup.v1`

---

## 10. Action Registry 구조

### Types (`lib/action-dispatcher/types.ts`)

- `ActionIntentWire` — LLM/backend intent (no URLs)
- `ActionIntentDefinition` — registry entry with `buildUrl`
- `DispatchedActionResult` — `EXECUTE` (native) or `WEB_OPEN` (fallback)

### Flow

1. Master wire or session state → `ActionIntentWire`
2. `dispatchAction(wire)` → `getActionIntentDefinition(action_id)`
3. `definition.buildUrl(normalizedParams)` or fallback_url
4. `wireActionsToLinkItems` → feed `ActionItem` with href + validation

### Catalog API

```ts
import { buildActionRegistryCatalog, getRegisteredActionIds } from "@/lib/data-model";
```

Schema version: `action-intent-registry.v1`.

---

## 11. EventCandidate 타입 정의

### Locked enums (`event-candidate.v1`)

| Field | Values |
|-------|--------|
| category | schedule, travel, finance, food, work, social, custom |
| source | message, notification, system |
| lifecycle | mentioned → candidate → confirmed → scheduled → active → completed → archived |

### Lifecycle mutations

`assertAllowedLifecycleMutation` in `schema-lock/mutation-rules.ts` — monotonic order only.

### Write path

```
Client/API wire
  → validateEventCandidateWire
  → commitEventUpsert | commitEventLifecycle | commitEventWireFromApi
  → event-store
```

### Read path

```
listEventCandidates()
  → projectScheduleFromTruth / timeline / master context resolver
```

---

## 12. Learning 데이터 모델

### A. Self-learning (`lib/self-learning/`)

| Type | Fields |
|------|--------|
| `ChatTurn` | role, content, timestamp? |
| `InteractionRecord` | userMessage, assistantSummary, routing metadata, failureKind |
| `FixProposal` | target (router_prompt, intent_mapping, …), action, failureCount |
| `SelfLearningReport` | analyzedAt, failureRate, proposals, regression gate |

Pipeline: `observeLiveTurn` → `classifyFailure` → `proposeSystemUpdates` → `runRegressionGate`.

### B. Live turn (`lib/self-learning/live-turn-types.ts`)

`LiveTurnLogEntry` — stage input|routing|output, chatAxis, routing patch, latencyMs, source client|server.

Submitted from `execute-orchestrate-turn` via `submitLiveTurn`.

### C. Archive rollup (`lib/archive/`)

`LearningSignal` — contextKey, actionKey, shown/clicked/executed/dismissed counts, rates.  
Folded into `LearningRollupEntry` in `learning-rollup-store.ts` (client-only).

### D. Correction log (`lib/corrections/`)

`CorrectionLogEntry` in `confirmation-types.ts` — place confirm outcomes; merges with `place_corrections` table.

### Separation rule

| Data | May influence routing? | SSOT? |
|------|------------------------|-------|
| InteractionRecord / FixProposal | Offline gate only | No |
| LearningRollup | Adaptive hints (read) | No |
| EventCandidate | Yes (schedule projection) | **Yes** |
| place_corrections | Confirm UX | No (preference) |

---

## Tests

```bash
npx tsx scripts/test-data-model-catalog.ts
npx tsx scripts/test-client-turn-route.ts
npm run test:mvp
```
