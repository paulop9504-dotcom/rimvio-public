# RIMVIO Surface Audit

**Repo:** `new-project` (Rimvio)  
**Date:** 2026-06-04  
**Related:** [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) · [PLATFORM_OS_ARCHITECTURE.md](./PLATFORM_OS_ARCHITECTURE.md) · [TIMELINE_PROJECTION.md](./TIMELINE_PROJECTION.md) · [ACTION_OS_SPINE.md](./ACTION_OS_SPINE.md)

---

## Executive diagnosis

Your instinct is right: most “꼬임” is **not a missing library** — it is **ownership ambiguity**.

| Product word (marketing) | What code treats it as today | What it should be |
|------------------------|------------------------------|-------------------|
| **캘린더** | `lib/calendar` + `CalendarBoard` + schedule projection + Supabase `containers` | One **CALENDAR Surface** reading one schedule projection |
| **채팅** | `lib/action-chat` (ingress + orchestrator + UI hooks) | **CHAT Surface** + **Input Layer** + **Capability** split |
| **알림** | `notification-shadow` + `notification-ingest` | **Input Layer** only → Event SSOT |

Until “calendar / chat / notifications” are **surfaces composed from capabilities**, each looks like its own mini-product with its own truth edge.

**Target stack (locked direction):**

```text
Surface Engine          →  which shell, which density, which ingress
        ↓
Capability Registry     →  plugins, action IDs, contracts (no UI, no SSOT)
        ↓
Event SSOT                →  event-candidate.v1 via commit-truth only
        ↓
Execution                 →  dispatcher, review queue, deep links
```

---

## Taxonomy (exactly one per module)

| Class | Owns | May write life truth? | May read life truth? | User-facing? |
|-------|------|----------------------|----------------------|--------------|
| **1. Source Of Truth** | Canonical life-state storage + sole write API | **Yes** (only here) | Yes | No |
| **2. Projection** | Derived views from SSOT (pure read) | No | Yes | No (data); yes when bound to Surface |
| **3. Input Layer** | Ingress, normalize, enqueue commits | Via `commit-truth` only | Yes | Partial (composer ingress) |
| **4. Capability** | Domain logic: candidates, URLs, NL branches | No (satellite stores OK) | Yes | No |
| **5. Surface** | Render + local UI state + egress to Input/Execution | No | Via projections only | **Yes** |
| **6. Infrastructure** | Auth, DB, i18n, brand, test harness | No | N/A | No |

**Reject ambiguous labels:**

- “Orchestrator” is **not** a Surface — it is a **Capability router**.
- “Calendar module” is **not** a product — **CalendarBoard** is the Surface; `lib/calendar` is Capability/Projection glue.
- “Global Brain” is **not** SSOT — satellite preference/status only.

---

## SSOT boundary (enforced today)

```text
WRITE:  lib/source-of-truth/commit-truth.ts  →  lib/events/event-store.ts
READ:   listEventCandidates / find*  →  projections & capabilities
```

Ingest adapters (`event-ingest-pipeline`, `notification-ingest`, `link-reminder-ingest`, `chat-scheduled-ingest`, `action-event-store`) call **`commitEventUpsert` / `commitEventLifecycle`** — correct.

Tests: `test-write-path-boundary`, `test-timeline-read-only-boundary`, `test-event-kernel-schema-lock`.

---

## Module registry (`lib/*` top-level)

Each row: **Class** · **Owner** · **Write truth?** · **Read truth?** · **Replaceable?** · **User-facing?** · **Surface or Capability?**

### 1 — Source Of Truth

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `events/event-store` | Life-state storage (`rimvio-event-candidates.v1`) | Platform / Event OS | **Direct** (internal; external via commit-truth) | Yes | No | No | — |
| `events/event-candidate` | Schema + `detectEventCandidate` draft | Event OS | No (draft only until commit) | Yes | No | No | Capability-adjacent |
| `events/event-lifecycle` | Monotonic lifecycle rules | Event OS | No | Yes | No | No | — |
| `event-kernel/schema-lock` | Frozen wire contracts | Event OS | No | Validate | No | No | Infrastructure |
| `source-of-truth/*` | **Only** public write + hydrate + project entry | Platform | **Yes** (facade) | Yes | No | No | — |

### 2 — Projection

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `source-of-truth/project-truth` | Schedule/reminder projection from candidates | Platform | No | Yes | Medium | No | — |
| `schedule/*` | `projectScheduleFromTruth`, conflict detect (pure) | Platform | No | Yes | Medium | No | — |
| `timeline-projection/*` | Timeline display routes (diff-only) | Surface Engine | No | Yes | Medium | Via Surface | — |
| `action-projection/*` | Action chips from routes + candidates | Surface Engine | No | Yes | Medium | Via Surface | — |
| `projection-stack/*` | `listDisplayRoutesFromStore` fan-out | Surface Engine | No | Yes | Medium | No | — |
| `dock-feed/*` | Dock feed list from store | Surface Engine | No | Yes | Yes | Via Surface | — |
| `narration-engine/*` | Narration strip from store | Surface Engine | No | Yes | Yes | Via Surface | — |
| `goal-engine/*` | `GoalSnapshot` derived per turn | DEOS hint | Turn cache only | Yes | Medium | No | — |
| `predictive-dock/*` | Anchor collection for dock | Surface Engine | No | Yes | Yes | Via Surface | — |
| `opportunity-engine/*` | Rank opportunities from candidates | DEOS | No | Yes | Yes | No | Capability-like |
| `events/project-event-calendar` | Calendar-shaped read model | Surface Engine | No | Yes | Merge into projection-stack | No | — |
| `threadline/*` | Behavioral cards / chips (display kernel) | Surface Engine | No | Yes | Medium | **Surface payload** | — |
| `presentation/*` | Presentation wire for cards | Surface Engine | No | Yes | Yes | Via Surface | — |

### 3 — Input Layer

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `events/event-ingest-pipeline` | Normalize signals → commit | Event OS | commit-truth | Yes | No | No | — |
| `events/notification-ingest` | Shadow → candidates | Event OS | commit-truth | Yes | No | No | — |
| `events/link-reminder-ingest` | Link reminders → candidates | Event OS | commit-truth | Yes | No | No | — |
| `events/chat-scheduled-ingest` | Chat schedule → candidates | Event OS | commit-truth | Yes | No | No | — |
| `events/event-lifecycle-runner` | Runner transitions | Event OS | commit-truth | Yes | Yes | No | — |
| `events/emit-event-candidate` | Emit draft to orchestrator path | Event OS | No | Yes | Yes | No | — |
| `source-of-truth/sync-link-reminders` | Pre-API sync satellite | Client ingress | commit-truth | Yes | Yes | No | — |
| `source-of-truth/serialize-for-api` | Client → server truth wire | Client | No | Yes | No | No | — |
| `source-of-truth/resolve-master-context` | Server hydrate | API | No | Yes | No | No | — |
| `action-chat/turn/*` | Parse/route/POST orchestrate | CHAT Surface ingress | No | No | Medium | Partial | Input |
| `notification-shadow/*` | Raw notification capture | Input | No | Yes | Yes | No | — |
| `local-links/*` | Link/reminder local satellite | Input | Indirect | Yes | Yes | No | — |
| `capture/*`, `share/*` | Screenshot/link capture ingress | Input | No | Yes | Yes | Partial | — |
| `peer-chat/*` (ingress half) | DM/group messages, @ai | PEER Surface ingress | No | Yes | Medium | Yes | Input |
| `chat-room/*` | Room types, @ai parse | PEER Input | No | No | Medium | No | — |
| `command-os/*` | @command compile ingress | CHAT Input | No | Yes | Medium | Partial | Input |

### 4 — Capability

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `action-chat/orchestrator/*` | NL routing, probes, finalize | CHAT Capability | No* | Yes | Low | No | **Capability** |
| `action-chat/routing-patches/*` | Axis, drift, replan branches | CHAT Capability | No | Yes | Medium | No | Capability |
| `action-dispatcher/*` | Action ID → URL | Execution | No | No | Low | No | Capability |
| `action-registry/*` | Dock usage recording | Learning | No | No | Yes | No | Capability |
| `plugin-registry/*` | Plugin catalog (target registry) | Platform OS | No | No | Medium | No | **Capability Registry** |
| `event-kernel/*` (excl. schema-lock) | Conversation kernel, contracts | Event OS | No | Yes | Low | No | Capability |
| `event-os/*` | Review queue, causal proof, execution steps | Event OS | commit-truth | Yes | Low | No | Capability + Execution |
| `event-commit-gate/*` | Slot collect / clarify | CHAT Capability | No | Yes | Medium | No | Capability |
| `schedule-intelligence/*` | Schedule NL branch | CHAT Capability | No | Yes | Medium | No | Capability |
| `context-resolver/*` | Place/meal discovery | CHAT Capability | No | Yes | Medium | No | Capability |
| `vitality-state/*` | Vitality gate | CHAT Capability | No | Yes | Yes | No | Capability |
| `global-brain/*` | Middleware patches (status, prefs) | Satellite | **Satellite write** | Yes | Medium | No | Capability (misnamed “brain”) |
| `goal-roadmap/*` | User goals store | Satellite | Satellite | Yes | Yes | Partial | Capability |
| `command-os/*` (compile) | Proof-driven compile | CHAT Capability | No | Yes | Medium | No | Capability |
| `calendar/*` | Prep overlay, tiered actions | **Mislabeled** | No | Yes | Yes | No | **Capability** (not Surface) |
| `action-decision/*` | Tiered overlay actions | DEOS | No | Yes | Medium | No | Capability |
| `deos/*` | composeDecision contract | DEOS | No | Yes | Low | No | Capability |
| `containers/*`, `container-store/*` | Goal containers (parallel model) | **Legacy satellite** | **Yes (local/Supabase)** | Yes | **Must converge** | Partial | Capability leakage |
| `corrections/*` | Place correction log | Learning | Satellite | Yes | Yes | No | Capability |
| `self-learning/*` | Offline loop, regression | QA | No | Logs | Yes | No | Infrastructure |
| `llm/*`, `llm-router/*` | Fallback inference | CHAT Capability | No | Yes | Yes | No | Capability |
| `enrichers/*`, `resolvers/*` | Link enrich, deep links | Feed Capability | No | No | Medium | No | Capability |
| `hybrid-retrieval/*`, `product-injector/*` | Retrieval / inject | CHAT Capability | No | Yes | Yes | No | Capability |
| `safety/*`, `policy/*` | Gates | Platform | No | Yes | No | No | Capability |
| `morning-orchestrator/*`, `event-horizon/*` | Proactive nudge | Capability | No | Yes | Yes | No | Capability |
| `action-os/*`, `action-spawn/*` | Execute / spawn | **Execution** | Session only | Yes | Medium | Partial | Execution |
| `deep-link-dispatch/*` | Client open URL | Execution | No | No | Medium | No | Execution |
| `trip-controller/*`, `life-domain-actions/*` | Trip/packing | Capability | No | Yes | Yes | No | Capability |
| `mention-*` / `event-kernel/action-contracts` | @ feature contracts | Capability Registry | No | Yes | Medium | No | Capability |

\*Orchestrator must not call `upsertEventCandidate` directly; client apply uses API → `commitEventWireFromApi`.

### 5 — Surface (lib helpers + `components/*`)

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `surface-router/*` | Map decisions → CALENDAR/DOCK/TIMELINE/NARRATION | **Surface Engine** | No | Projections | Medium | No | **Surface Engine** |
| `surface-truth-unifier/*` | Unify wires for render | Surface Engine | No | Yes | Yes | No | Surface Engine |
| `surface-render-contract/*` | Render contract types | Surface Engine | No | Yes | Yes | No | Surface Engine |
| `visibility-bridge/*` | Visibility scores | Surface Engine | No | Yes | Yes | No | Surface Engine |
| `action-chat/chat-store` | Chat transcript UI state | CHAT Surface | No | No | Yes | Yes | **Surface** |
| `feed/*` (lib) | Feed scroll/helpers | FEED Surface | No | No | Yes | Yes | Surface |
| `components/action-chat-feed` | Main feed + composer | **FEED/CHAT Surface** | No | Projections | Low | **Yes** | **Surface** |
| `components/action-shorts-feed` | Feed shell wrapper | FEED Surface | No | No | Medium | Yes | Surface |
| `components/threadline/*` | Today thread UI | TIMELINE Surface | No | Projections | Medium | Yes | Surface |
| `components/action-chat/calendar-board` | Calendar UI | **CALENDAR Surface** | No | Projections | Medium | Yes | Surface |
| `components/peer-chat/*` | DM/group UI | **PEER Surface** | No | Partial | Medium | Yes | Surface |
| `components/app-shell`, `app-nav` | Chrome, tabs | Shell Surface | No | No | Low | Yes | Surface |
| `hooks/use-action-chat` | Turn orchestration **in UI layer** | **Violation risk** | No | Mixed | Split to turn/* | Yes | Surface (should thin) |

### 6 — Infrastructure

| Module | Why it exists | Owner | Write | Read | Replaceable | UI | S/C |
|--------|---------------|-------|-------|------|-------------|-----|-----|
| `supabase/*`, `auth/*`, `server/*` | Remote DB, session | Infra | DB rows (not life SSOT) | Yes | Yes | No | Infrastructure |
| `persistence/*`, `nexus-db/*` | Persistence bridges | Infra | No | Yes | Yes | No | Infrastructure |
| `i18n/*`, `copy/*`, `brand/*`, `ui/*` | Locale, tokens | Infra | No | No | Yes | Yes | Infrastructure |
| `analytics/*`, `personalization/*` | Click learning (Postgres) | Infra | Analytics | Yes | Yes | No | Infrastructure |
| `testing/*`, `test/*`, `dev/*`, `demo/*` | Tests, fixtures | Infra | Test reset | Yes | Yes | No | Infrastructure |
| `http/*`, `transport/*`, `pwa/*` | HTTP, PWA | Infra | No | No | Yes | No | Infrastructure |
| `data-model/*` | Catalog re-exports | Docs/tests | No | No | Yes | No | Infrastructure |

### Unclassified / merge candidates (force one class)

| Module | Forced class | Rationale |
|--------|--------------|-----------|
| `archive/*` | Projection + Input (telemetry fold) | Rollup is read for ranking; fold is write to satellite |
| `behavior/*`, `behavior-engine/*` | Capability | Telemetry interpretation |
| `cognitive-*` | Capability (experimental) | Not SSOT; merge or freeze per ACTION_OS_SPINE |
| `data-architect/*`, `data-ingestion/*` | Capability | LLM/data pipeline |
| `beam/*`, `rooms/*`, `social/*` | Surface or Infra | Room product = Surface; beam = infra |
| `commerce/*`, `markets/*` | Capability | Enrichment |
| `native-bridge/*` | Execution | OS bridges |
| `profile/*`, `preferences/*`, `preference/*` | Infrastructure / satellite | User profile, not life events |
| `screenshot/*`, `vision/*` | Input | Capture ingress |
| `study/*`, `contextual-aux/*` | Capability | Study aux branches |
| `time/*`, `time-decision/*` | Capability | Parsing |
| `location-memory/*`, `location-intelligence/*` | Capability | Confirm/location |
| `integration/*` | Infrastructure | OAuth |
| `layers/*`, `layout/*`, `routing/*` (root) | Infrastructure / legacy | Merge into surface-router |
| `surface-*` (already 5) | Surface Engine | Keep |
| `action-template/*`, `actions/*` | Capability Registry | User-defined actions |
| `event-feedback-loop/*` | Input | Feedback → learning |
| `event-candidate/*` (root duplicate name?) | Check merge with `events/` | Avoid duplicate package |
| `dock-feed` | Projection | Dock surface feed |
| `home/*` | Surface | Home strips |
| `onboarding/*` | Surface | Cold start |
| `platform/*` | Infrastructure | Platform helpers |
| `react-atomic-frame-binder/*` | Surface | UI binder |
| `remote/*`, `geo/*`, `naver/*`, `places/*` | Capability | External APIs |
| `resource-pool/*` | Surface | Sheet UI backing |
| `secondary-action-generator/*` | Capability | AUX generation |
| `product-self-learning/*` | Infrastructure | Product learning |
| `container-rework/*` | **Delete or merge** | Parallel container experiment |
| `conversation-memory/*` | Capability | Orchestrator memory |
| `intent/*`, `intent-context-extractor/*` | Capability | Intent extraction |
| `knowledge/*` | Capability + satellite | Knowledge entities |
| `links/*` | Input | Link model |
| `media/*` | Infrastructure | Media helpers |
| `mappers/*` | Infrastructure | DTO mappers |
| `design/*` | Infrastructure | Design tokens |
| `experience/*` | Surface | Experience mode UI |
| `dual-mode/*` | Input | Link lifecycle |
| `local-parking/*` | Capability | Parking mention |
| `locate/*` | Capability | Image locate |
| `peer/*` | Input/Surface | Peer graph |
| `search-intent/*` | Capability | Search |
| `visibility-bridge` | Surface Engine | Already classified |
| `vitality/*` | Capability | Overlap with vitality-state |
| `hooks/*` (lib) | **Anti-pattern** | Hooks should live next to Surfaces in `hooks/` root |

---

## `app/*` routes (Surface map)

| Route / area | Class | Notes |
|--------------|-------|-------|
| `app/feed` | **Surface** (FEED + CHAT) | Immersive shell; not a Capability |
| `app/api/chat/orchestrate` | **Input** → Capability | API boundary |
| `app/archive` | **Surface** | Read-only archive view |
| `app/peers`, `app/r/*` | **Surface** (PEER) | Separate from life SSOT |
| `app/welcome`, auth pages | **Surface** | Onboarding |
| `supabase/migrations` | **Infrastructure** | Personalization, peers, `containers` — **not** Event SSOT |

---

## Violations & smells

### Fake surfaces (product-shaped folders that are not Surfaces)

| Fake surface | Actual class | Symptom |
|--------------|--------------|---------|
| `lib/calendar` | Capability + projection inputs | Team says “calendar product”; code is prep overlay builder |
| `lib/action-chat` (whole tree) | Input + Capability + Surface state | Composer bugs, orchestrator bugs, and UI bugs share one folder |
| `lib/global-brain` | Capability + satellite stores | Name implies SSOT; only patches status/prefs |
| `lib/containers` + Supabase `containers` | Parallel truth | Second calendar/life graph beside EventCandidate |
| `hooks/use-action-chat` | Fat Surface controller | 2k LOC mixes ingress, capability calls, persistence |

### Duplicate projections

| A | B | Issue |
|---|---|-------|
| `projectScheduleFromTruth` | `masterContext.existingSchedule` (legacy wire) | Server ignores client schedule when `eventCandidates[]` present — client still sends both |
| `timeline-projection` | `threadline` cards | Two TIMELINE-like render paths |
| `action-projection` | `predictive-dock` anchors | Dock chips vs projection routes |
| `listDisplayRoutesFromStore` | Direct `listEventCandidates` in 8+ modules | Fan-out not centralized → drift risk |
| `GoalSnapshot` | `goal-roadmap-store` | Two “goal” shapes |

### Capability leakage

| Leak | Where | Fix |
|------|-------|-----|
| Orchestrator persists containers | `post-finalize` / `routeOrchestratorContainer` | Egress: explicit commit or satellite API |
| Container cloud vs EventCandidate | `010_containers_events.sql` | Migrate container events → candidates or demote to archive |
| Global brain writes on “read” | `run-global-brain-middleware` | Fold → commit-truth or satellite only on ACK |
| Peer lens ingests schedule | `peer-chat/ai-lens/execute-lens-bubble` | Input adapter only; document in registry |
| Learning rollup affects MAIN | Archive → prep resolver | OK if ranking is explicit Capability contract |

### Truth ownership violations (actual / latent)

| Status | Item |
|--------|------|
| ✅ Enforced | `goal-engine`, `schedule`, `timeline-projection` do not call write APIs (CI) |
| ✅ Enforced | Ingest pipelines use `commit-truth` |
| ⚠️ Latent | Direct `event-store` read from many modules (OK if read-only; should go through `project-truth` facade) |
| ❌ Structural | `containers` table + local container store claim “events” |
| ❌ Structural | `action-chat/chat-store` treated as conversation truth (OK as **transcript** satellite — document) |
| ❌ UX | Calendar/notification **Surfaces** implied to own state |

---

## Surface vs Capability (product verbs)

| User verb | Surface (render) | Capability (work) | SSOT | Execution |
|-----------|------------------|-------------------|------|-----------|
| See schedule | `CalendarBoard`, CALENDAR surface route | `schedule-intelligence`, prep overlay | EventCandidate | — |
| Chat “내일 3시” | `ActionChatFeed`, composer | `orchestrator`, `event-ingest` | EventCandidate | `action-dispatcher` |
| Tap action chip | Threadline / dock | `action-projection`, `rank-actions` | Read | `executeDockActionWire` |
| Notification | System UI (future) | `notification-ingest` | EventCandidate | — |
| @mention feature | Composer | `action-contracts`, `dispatch` | Optional candidate | Deep link |

---

## Migration plan → target stack

### Phase 0 — Lock language (1 week)

- [ ] Rename in docs only: no module named “calendar product” — use **CALENDAR Surface**.
- [ ] Add `docs/SURFACE_CAPABILITY_BOUNDARY.md` (one page) referencing this audit.
- [ ] CI: extend `test-write-path-boundary` to ban `event-store` imports outside allowlist file.

### Phase 1 — Surface Engine (2–3 weeks)

**Goal:** All visibility through `surface-router` + `surface-render-contract`; no Capability imports in `components/*`.

| Action | Modules |
|--------|---------|
| Consolidate | `surface-router`, `surface-truth-unifier`, `surface-render-contract`, `visibility-bridge` → `lib/surface-engine/` |
| Register surfaces | `FEED_CHAT`, `CALENDAR`, `TIMELINE`, `DOCK`, `NARRATION`, `PEER_DM` |
| Thin `use-action-chat` | Move logic to `action-chat/turn/*` + `execute-*-turn.ts` per route |
| Delete fake surface API | `lib/calendar` exports only `buildPrepOverlayProjection()` — no direct store |

### Phase 2 — Capability Registry (2–3 weeks)

**Goal:** Single registry merges `plugin-registry` + `ACTION_INTENT_REGISTRY` + `event-kernel/action-contracts`.

| Action | Modules |
|--------|---------|
| Unify catalog | `lib/capability-registry/` ← plugin-registry, action-dispatcher catalog, mention contracts |
| Orchestrator probes | Only call registry IDs; no inline URL building |
| Deprecate | Duplicate routing in `cognitive-orchestrator`, `cognitive-streaming-cycle` (freeze) |

### Phase 3 — Event SSOT convergence (3–4 weeks)

| Action | Modules |
|--------|---------|
| Read facade | `listLifeState()` in `source-of-truth` — ban scattered `listEventCandidates` except projections |
| Container migration | `containers` → EventCandidate metadata or archive-only |
| Master context | Remove `existingSchedule` from client wire when `eventCandidates` sent |
| OCR/review | All paths → `ingestScheduleSignal` → commit-truth (already mostly true) |

### Phase 4 — Execution plane (2 weeks)

| Action | Modules |
|--------|---------|
| Single executor | `lib/execution/` ← `action-dispatcher`, `action-os/execute`, `event-os` review queue |
| Surface egress | Surfaces emit `ExecutionIntent` only; never `kakaomap://` strings |
| Proof | `CausalProof` append on execution ACK |

### Phase 5 — Product surfaces cutover

| Surface | Keep | Remove from surface code |
|---------|------|---------------------------|
| **FEED+CHAT** | `ActionChatFeed`, orchestrate API | Direct schedule writes, container persist |
| **CALENDAR** | `CalendarBoard` | `lib/calendar` as separate “app” |
| **PEER** | `peer-chat` components | Schedule ingest in lens without contract |
| **NOTIFICATIONS** | Future strip | `notification-shadow` as display-only |

---

## Ranked roadmap (audit-driven)

| Rank | Item | Unblocks |
|------|------|----------|
| P0 | Document + enforce SSOT read facade | Stops projection drift |
| P1 | Surface Engine folder + ban Capability imports in components | Composer/orchestrator decoupling |
| P1 | Thin `use-action-chat` + turn executors | Touch/routing clarity |
| P2 | Capability Registry merge | Orchestrator probe split becomes safe |
| P2 | Container → EventCandidate migration | Calendar/chat truth single path |
| P3 | Execution plane package | Deep links leave LLM/orchestrator |
| P3 | Freeze `cognitive-*` / `container-rework` | Stops parallel OS |

---

## Quick reference: allowlist for `event-store` reads

**Writes:** `commit-truth.ts` only (and test resets).

**Reads (today — should shrink to projection-stack + source-of-truth):**

- `source-of-truth/project-truth.ts`
- `projection-stack/*`, `timeline-projection/*`, `action-projection/*`
- `events/*` ingest (find before upsert)
- `event-os/snapshot-*` (audit/review)

**Target:** one `readLifeProjections()` used by Surface Engine and Capability ranking only.

---

## Conclusion

Rimvio already has the **correct SSOT write path** (`commit-truth`). The tangle is **naming and layering**: calendar/chat/notifications are **Surfaces** in the product mind but **Capabilities + satellites** in the tree.

Running this audit against PRs means asking one question:

> Does this PR add a Surface, register a Capability, commit truth, or execute?

If the answer is “all of the above,” split the PR.
