# AI-ready Personal Read Model

> **Status:** Design (v0.1) · **Code gate (planned):** `lib/personal-read-model/`  
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · **Layers:** [RIMVIO_EXPERIENCE_LAYERS.md](./RIMVIO_EXPERIENCE_LAYERS.md) · **Spine:** [ACTION_OS_SPINE.md](./ACTION_OS_SPINE.md) · **Scope AI:** [RIMVIO_SCOPE_AI.md](./RIMVIO_SCOPE_AI.md)

---

## Thesis

LLM에 넘기는 데이터는 **raw store sweep이 아니라**, Experience Layers 위에서 이미 계산된 **projection export**여야 한다.

Personal Read Model(PRM)은 Rimvio의 **두 번째 truth가 아니다.**  
EventCandidate · rollup · meaning graph가 SSOT이고, PRM은 AI·orchestrator·Recall이 **한 프레임에서 읽는 typed DTO**다.

```text
[Write SSOT]                    [Read frame — existing]           [AI export — new]
EventCandidate store     →      life-read-model/readSurface  →   assemblePersonalReadPacket
learning-rollup          →      archive/rollup               →        │
meaning graph            →      lib/meaning/*                →        │
globe hub metadata       →      context-hub/*                →        ▼
@ registry               →      action-registry              →   PersonalReadPacket
                                                                      │
                    ┌─────────────────────────────────────────────────┤
                    ▼                     ▼                             ▼
            global-brain block    orchestrator tier-4          recall ranker (future)
            validateActionContract   resolveLinkMainOffer gates
```

**Non-goals (v0.1):**

- Server-side archive/rollup sync (spine frozen)
- Parallel `src/ai/agent.ts` orchestrator
- LLM-authored meaning stored as SSOT
- Feed/chat hero를 LLM stream으로 교체

---

## Contract: `PersonalReadPacket`

파일: `lib/personal-read-model/types.ts`

DTO 이름은 `ContextPacket` alias 허용. Rimvio 코드베이스에서는 **`PersonalReadPacket`** 을 canonical로 쓴다 (life-read-model과 구분).

### Top-level shape

```typescript
/** AI/orchestrator/recall — one read frame. Never persisted as SSOT. */
export type PersonalReadPacket = {
  meta: PersonalReadMeta;
  fact: PersonalReadFactSlice;
  experience: PersonalReadExperienceSlice;
  meaning: PersonalReadMeaningSlice;
  recall: PersonalReadRecallSlice;
  action: PersonalReadActionSlice;
  gates: PersonalReadGateSlice;
};
```

### Slice definitions

| Slice | Layer | Purpose | Provenance rule |
|-------|-------|---------|-----------------|
| `meta` | — | assembly frame | assembler only |
| `fact` | FACT | IDs + schedule anchors | EventCandidate, links |
| `experience` | EXPERIENCE | active situation bundle | life-read-model + globe |
| `meaning` | MEANING | learned patterns (no LLM) | meaning graph + rollup |
| `recall` | RECALL | eligible triggers (not copy) | opportunity + horizon |
| `action` | ACTION | registry snapshot + ranked MAIN | @ registry + rollup |
| `gates` | ACTION | hard constraints LLM must respect | trust + confidence |

#### `meta`

```typescript
export type PersonalReadScope = "client" | "server";

export type PersonalReadMeta = {
  assembledAt: string;          // ISO
  scope: PersonalReadScope;
  dateKey: string;                // formatDateKey()
  userId: string | null;          // Supabase auth when server
  /** Rimvio Scope AI — guardian vs explorer */
  scopeAi: "guardian" | "explorer";
  /** Active globe context / focused EC */
  activeContextId: string | null;
  activeContextTitle: string | null;
  location: {
    lat: number | null;
    lng: number | null;
    label: string | null;
    spatialMode: "unknown" | "nearby_query" | "here_query";
  } | null;
  /** Hub kinds connected to activeContextId */
  activeHubKinds: string[];       // ContextHubKind[]
  trustLevel: 1 | 2 | 3;           // TrustStaircaseStage
};
```

#### `fact`

```typescript
export type PersonalReadFactSlice = {
  /** Recent EC ids — ordered, capped (default 12) */
  recentEventIds: string[];
  /** Today's schedule projection — same shape orchestrator uses */
  scheduleDateKey: string;
  scheduleTaskCount: number;
  /** Share-capture links in frame (Feed/Now) — ids only + domain/category */
  activeLinkIds: string[];
  linkSummaries: Array<{
    id: string;
    domain: string;
    category: string;
    title: string;
  }>;
};
```

#### `experience`

```typescript
export type PersonalReadExperienceSlice = {
  /** Selected / focused experience node */
  focus: {
    eventId: string | null;
    title: string | null;
    place: string | null;
    category: string | null;
    visibility: "private" | "external" | null;
  };
  spatial: {
    pinIds: string[];
    tripLegId: string | null;
    departureHubIata: string | null;
  };
  /** From readSurface narrations — one headline max */
  narrationHeadline: string | null;
  /** Hub rows for focus context — executable URLs when resolved */
  hubLinks: Array<{
    kind: string;
    label: string;
    actionUrl: string | null;
    flightProvider: string | null;
  }>;
};
```

#### `meaning`

```typescript
export type MeaningProvenance = "behavior" | "rollup" | "relationship_rule";

export type PersonalReadMeaningSlice = {
  /** Top edges from buildMeaningGraph — IDs + scores, not free text only */
  topEdges: Array<{
    edgeId: string;
    meaningLabel: string;       // e.g. "민수 = 제주"
    totalScore: number;
    eventIds: string[];
    provenance: MeaningProvenance;
  }>;
  relationshipLines: Array<{
    peerLabel: string;
    line: string;
    confidence: number;
    frame: string | null;
  }>;
  /** Season / life-phase pattern — rule-derived */
  seasonPattern: {
    key: string;
    label: string;
    confidence: number;
  } | null;
  /** Rollup-weighted action affinity for active context */
  rollupAffinities: Array<{
    contextKey: string;
    actionKey: string;
    weight: number;
    shown: number;
    executed: number;
  }>;
};
```

#### `recall`

```typescript
export type RecallTriggerKind =
  | "calendar_horizon"
  | "travel_d_minus"
  | "gap_since_visit"
  | "relationship_nudge"
  | "opportunity_rank";

export type PersonalReadRecallSlice = {
  /** Deterministic triggers only — copy generated elsewhere */
  eligibleTriggers: Array<{
    kind: RecallTriggerKind;
    eventId: string;
    urgency: number;           // 0–100
    reasonCode: string;
  }>;
  /** Event horizon insights — from buildLifeContextSnapshot */
  horizonInsights: Array<{
    kind: string;
    headline: string;
    severity: "medium" | "high";
  }>;
};
```

#### `action`

```typescript
export type PersonalReadActionSlice = {
  /** Promoted + manual registry entries relevant to frame */
  registryEntries: Array<{
    id: string;
    contextKey: string;
    category: string;
    scenario: string;
    mainActionType: string | null;
    slotNames: string[];         // parameter keys LLM may fill
    templateStatus: string;
  }>;
  /** Pre-ranked MAIN candidates — deterministic before LLM */
  rankedMainCandidates: Array<{
    actionKey: string;
    label: string;
    score: number;
    contextKey: string;
    source: "rollup" | "registry" | "link_enricher";
  }>;
  /** Context hub service catalog ids available on focus */
  hubServiceIds: string[];
};
```

#### `gates`

```typescript
export type PersonalReadGateSlice = {
  minConfidenceForMain: number;
  disclosureTier: "hidden" | "soft" | "full";
  blockedActionTypes: string[];
  urgencyBypass: boolean;        // travel D-0/D-1
  /** Scope AI — external explorer must not nudge private life */
  forbidLifeRewrite: boolean;
  forbidRecommendationHero: boolean;
};
```

---

## File map

### New module (thin boundary)

```text
lib/personal-read-model/
├── index.ts                          # public facade — allowlist entry
├── types.ts                          # PersonalReadPacket + slice types
├── assemble-personal-read-packet.ts  # sole assembler
├── map-fact-slice.ts
├── map-experience-slice.ts
├── map-meaning-slice.ts
├── map-recall-slice.ts
├── map-action-slice.ts
├── map-gate-slice.ts
├── resolve-read-scope-ai.ts          # guardian | explorer from pin scope
├── serialize-packet-for-llm.ts       # JSON block for prompt injection
├── validate-action-contract.ts       # LLM output → registry slot check
└── personal-read-packet-cache.ts     # optional TTL memo (client only)
```

### Existing modules — read only (no duplicate SSOT)

| Source | Path | Maps to slice |
|--------|------|---------------|
| Life read frame | `lib/life-read-model/read-life-projections.ts` | `fact`, partial `experience` |
| Surface bundle | `lib/life-read-model/read-surface.ts` | `experience`, `action.rankedMainCandidates` |
| Event resolver | `lib/life-read-model/create-event-resolver.ts` | `experience.focus` |
| Master context | `lib/source-of-truth/resolve-master-context.ts` | `meta.trustLevel`, `fact.schedule*` |
| Meaning graph | `lib/meaning/build-meaning-graph.ts` | `meaning.topEdges` |
| Relationship line | `lib/copy/project-relationship-meaning-line.ts` | `meaning.relationshipLines` |
| Learning rollup | `lib/archive/learning-rollup-store.ts` | `meaning.rollupAffinities` |
| Rollup weight | `lib/archive/sync-learning-rollup-from-telemetry.ts` | weights in affinities |
| Opportunity / recall signals | `lib/opportunity-engine/rank-event-opportunities.ts` | `recall.eligibleTriggers` |
| Event horizon | `lib/event-horizon/build-life-context-snapshot.ts` | `recall.horizonInsights` |
| Globe hubs | `lib/globe/context-hub/list-context-hub-links.ts` | `experience.hubLinks`, `meta.activeHubKinds` |
| Hub catalog | `lib/globe/context-hub/context-hub-service-catalog.ts` | `action.hubServiceIds` |
| Trip leg | `lib/globe/trip-leg-metadata.ts` | `experience.spatial.tripLegId` |
| Action registry | `lib/action-registry/manual-templates.ts` | `action.registryEntries` |
| Registry catalog | `lib/data-model/action-registry-catalog.ts` | slot metadata |
| Feed MAIN rank | `lib/feed/rank-feed-link-actions.ts` | `action.rankedMainCandidates` |
| Link MAIN gate | `lib/action-chat/resolve-link-main-offer.ts` | `gates.*` |
| Confidence | `lib/action-chat/action-confidence.ts` | `gates.minConfidenceForMain`, tier |
| Scope AI | `lib/scope-ai/*` | `meta.scopeAi`, gate flags |
| Global Brain (consumer) | `lib/global-brain/build-context-injection-block.ts` | consumes serialized packet |
| Orchestrator (consumer) | `lib/action-chat/orchestrator/tiers/tier-4-registry.ts` | contract validation |

### Tests & gate

```text
scripts/test-personal-read-packet.ts       # slice mapping + golden packet
scripts/test-personal-read-allowlist.ts    # UI/AI must not bypass facade
lib/personal-read-model/index.ts           # re-export only; grep gate in CI
```

Add to `package.json` test chain:

```json
"test:personal-read-model": "tsx scripts/test-personal-read-packet.ts"
```

---

## Assembler: `assemblePersonalReadPacket`

파일: `lib/personal-read-model/assemble-personal-read-packet.ts`

### Input

```typescript
export type AssemblePersonalReadInput = {
  scope: PersonalReadScope;
  userId?: string | null;
  dateKey?: string;
  now?: Date;
  /** Globe / prep / chat focus */
  activeContextId?: string | null;
  activeLinkId?: string | null;
  /** Client master context payload — server orchestrator path */
  masterContext?: Partial<MasterContextApiPayload> | null;
  location?: UserLocationWire | null;
  /** Skip LLM serialization cache */
  bypassCache?: boolean;
};
```

### Algorithm (single pass, no store sweep)

```text
1. dateKey ← input.dateKey ?? formatDateKey(now)
2. life ← readLifeProjections({ dateKey })
3. surface ← readSurface({ dateKey, focusedEcId: activeContextId, ...context hooks })
4. focusEvent ← findLifeEventCandidate(activeContextId) ?? resolver from surface
5. Parallel map_* slices from { life, surface, focusEvent, input }
6. gates ← derive from resolveLinkMainOffer when activeLinkId; else default gates from trust
7. Return PersonalReadPacket — do NOT write back to any store
```

### Field mapping table (implementer reference)

| Packet field | Function | Primary source |
|--------------|----------|----------------|
| `meta.assembledAt` | inline | `new Date().toISOString()` |
| `meta.scopeAi` | `resolveReadScopeAi()` | `lib/scope-ai/`, pin visibility |
| `meta.activeHubKinds` | `mapExperienceSlice` | `readContextHubIds(focusEvent)` |
| `meta.location` | input + `GlobalBrainSnapshot.userLocation` pattern | client geo / master payload |
| `fact.recentEventIds` | `mapFactSlice` | `life.events` sorted by recency, cap 12 |
| `fact.linkSummaries` | `mapFactSlice` | active link row or inbox head |
| `experience.hubLinks` | `mapExperienceSlice` | `listContextHubLinks(focusEvent)` |
| `experience.spatial.tripLegId` | `mapExperienceSlice` | `readTripLegFromEvent(focusEvent)` |
| `experience.narrationHeadline` | `mapExperienceSlice` | `surface.narrations[0]?.headline` |
| `meaning.topEdges` | `mapMeaningSlice` | `topMeaningEdges(buildMeaningGraph(...), n=5)` |
| `meaning.relationshipLines` | `mapMeaningSlice` | `projectRelationshipMeaningLine` per peer |
| `meaning.rollupAffinities` | `mapMeaningSlice` | `listLearningRollup()` filtered by contextKey |
| `recall.eligibleTriggers` | `mapRecallSlice` | `listRankedEventOpportunities` + travel D-minus rules |
| `recall.horizonInsights` | `mapRecallSlice` | `buildLifeContextSnapshot` → horizon |
| `action.registryEntries` | `mapActionSlice` | `listManualCoreTemplates()` + promoted store |
| `action.rankedMainCandidates` | `mapActionSlice` | `surface.actionProjection` + `rankFeedLinkActionsForDock` |
| `gates.disclosureTier` | `mapGateSlice` | `resolveLinkMainOffer` or `resolveDisclosureTier` |
| `gates.urgencyBypass` | `mapGateSlice` | travel D-0/D-1 from `resolve-link-main-offer` |

---

## Consumers (who reads the packet)

| Consumer | Integration point | Uses slices |
|----------|-------------------|-------------|
| **Global Brain** | Replace ad-hoc snapshot stitch in `build-context-injection-block.ts` | all except raw fact ids → use `serializePacketForLlm()` |
| **Orchestrator tier-4** | Inject before registry match | `action`, `gates` |
| **LLM router** | `lib/action-chat/llm-router/` fallback only | `action.registryEntries`, `gates` |
| **Feed / Now / Stack MAIN** | Optional: unify gate inputs | `gates`, `action.rankedMainCandidates` |
| **Recall shell (future)** | Trigger pick → 1-line copy | `recall`, `meaning` |
| **Prep surface** | Context row enrichment | `experience`, `meaning.relationshipLines` |
| **Debug panel (dev)** | `/dev/personal-read` | full packet JSON |

**Rule:** New AI features import **`@/lib/personal-read-model`** only.  
Direct reads of rollup + meaning + hub in AI paths → `scripts/test-personal-read-allowlist.ts` fail.

---

## LLM boundary

### Serialize

`lib/personal-read-model/serialize-packet-for-llm.ts`

- Output: compact JSON string block `[PersonalReadPacket v1]` — no raw HTML, no full EventCandidate blobs
- Strip: internal ids when `scopeAi === "explorer"` and visibility !== external
- Max sizes: `topEdges` 5, `rollupAffinities` 8, `registryEntries` 12, `rankedMainCandidates` 3

### Validate

`lib/personal-read-model/validate-action-contract.ts`

```typescript
export type ActionContractResponse = {
  templateId: string | null;
  filledSlots: Record<string, string>;
  mainActionType: string | null;
} | null;

export function validateActionContract(
  raw: unknown,
  packet: PersonalReadPacket,
): ActionContractResponse;
```

Rules:

1. `templateId` must exist in `packet.action.registryEntries`
2. `filledSlots` keys ⊆ entry `slotNames`
3. `mainActionType` must match entry or null
4. Violation → `null` (orchestrator tier fallback, no free-text action)

System prompt fragment (not a new agent):

```text
You are Rimvio Action OS (Guardian|Explorer per packet.meta.scopeAi).
1. Do NOT suggest generic life advice.
2. Fill ONLY slots listed in action.registryEntries.
3. Respect gates — if minConfidenceForMain not met, return null.
4. If no registry entry fits, return null.
```

---

## Invalidation & cache

| Event | Invalidate |
|-------|------------|
| `EVENT_CANDIDATES_UPDATED` | full packet |
| Learning rollup write | `meaning`, `action` slices |
| Hub connect/disconnect | `experience`, `meta.activeHubKinds` |
| Link persist / Now handoff | `fact`, `gates` |
| Trust stage change | `gates`, `meta.trustLevel` |

`personal-read-packet-cache.ts`:

- Client-only `Map<cacheKey, { packet, expiresAt }>`
- TTL default 30s; bypass on `activeContextId` change
- Server path: no cache (assemble per request)

---

## Phase rollout

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| **P0** | `types.ts` + `assemble-personal-read-packet.ts` + tests | existing life-read-model |
| **P1** | Wire `serializePacketForLlm` into Global Brain block | P0 |
| **P2** | `validateActionContract` in tier-4-registry | P1 |
| **P3** | Recall trigger ranker reads `recall` slice only | opportunity + horizon |
| **P4** | Optional server assemble in orchestrator API route | auth + event wire |
| **P5** | Sync layer projects remote rollup into `meaning` (when spine unfrozen) | server archive |

---

## Invariants (PR reject)

- PersonalReadPacket **persisted to DB** as SSOT
- LLM output written into `meaning` or rollup without behavior telemetry
- Parallel orchestrator bypassing tier gates
- `recentInterests: string[]` without ids, scores, or provenance
- Hero UI driven by unconstrained LLM text
- Explorer scope receiving private `fact` fields without redaction

---

## Example packet (truncated)

```json
{
  "meta": {
    "assembledAt": "2026-06-15T09:00:00.000Z",
    "scope": "client",
    "dateKey": "2026-06-15",
    "scopeAi": "guardian",
    "activeContextId": "ec_jeju_2026",
    "activeHubKinds": ["departure_airport"],
    "trustLevel": 2
  },
  "experience": {
    "focus": { "eventId": "ec_jeju_2026", "title": "제주", "place": "제주", "visibility": "private" },
    "hubLinks": [{ "kind": "departure_airport", "label": "김포", "actionUrl": "https://...", "flightProvider": "naver_flight" }]
  },
  "meaning": {
    "topEdges": [{ "meaningLabel": "민수 = 제주", "totalScore": 42, "provenance": "behavior" }],
    "rollupAffinities": [{ "contextKey": "travel:jeju", "actionKey": "book_flight", "weight": 0.72 }]
  },
  "recall": {
    "eligibleTriggers": [{ "kind": "travel_d_minus", "eventId": "ec_jeju_2026", "urgency": 85 }]
  },
  "action": {
    "rankedMainCandidates": [{ "actionKey": "open_flight", "label": "항공편 보기", "score": 0.81, "source": "rollup" }]
  },
  "gates": { "minConfidenceForMain": 0.55, "disclosureTier": "full", "urgencyBypass": true }
}
```

---

## Related docs

- [GLOBAL_BRAIN_ARCHITECTURE.md](./GLOBAL_BRAIN_ARCHITECTURE.md) — packet replaces ad-hoc snapshot stitch
- [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) — EventCandidate remains write SSOT
- [RIMVIO_ARCHITECTURE_BOUNDARIES.md](./RIMVIO_ARCHITECTURE_BOUNDARIES.md) — PRM sits above `lib/life-read-model/`, not inside `lib/core/` write path
- [DATA_MODEL_REFERENCE.md](./DATA_MODEL_REFERENCE.md) — registry catalog slot names
