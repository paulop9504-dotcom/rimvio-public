# DEOS Decision Contract

**Status:** SHIP (contract + types) · Implementation wires incrementally  
**Related:** [THREADLINE_BEHAVIORAL_KERNEL_V1.md](./THREADLINE_BEHAVIORAL_KERNEL_V1.md) · [PLATFORM_OS_ARCHITECTURE.md](./PLATFORM_OS_ARCHITECTURE.md) (plugins, finance, partner/external)

---

## Architecture (frozen)

```
재료 = Plugins + Probability   (input only)
제약 = State                   (transition legality only)
결정 = Decision Engine         (composeDecision — sole authority)
실행 = Execution Router + Plugins
기록 = CausalProof / DEOS
표현 = Threadline UX           (consumes DecisionSurface only)
```

**Principle:** State defines possibility. Plugins + Probability supply options. **Decision Engine selects.** State validates. Plugins execute. UX renders.

---

## Layer rules

| Layer | May | Must not |
|-------|-----|----------|
| **Plugins** | `CandidateAction[]` | `DecisionSurface`, UI chips, final action |
| **Probability** | `RankedCandidate[]` (order/score) | `winner`, execution, UI copy |
| **State** | `validateStateTransition` | Choose among candidates |
| **Decision Engine** | `composeDecision()` → `DecisionSurface` | Execute, mutate SSOT |
| **UX** | Render surface + user ingress | Read scores, proof internals, compose forks |

---

## Forbidden bypasses

1. Plugin returns `primaryAction` or `recommendedChip` shown without `composeDecision`.
2. Probability sets `selectedCandidateId`.
3. Orchestrator (OCR / Command OS / chat) emits Threadline chips directly.
4. State machine encodes default action per state enum.
5. UI reads `CausalProof` fields to build forks (proof is **post-decision** narrative only).

---

## Core types (`lib/deos/decision/`)

### `CandidateAction` (plugin input)

```typescript
{
  id: string;
  pluginId: string;
  source: "internal" | "external";
  label: string;           // human chip label candidate
  kind: CandidateActionKind;
  payload: Record<string, unknown>;  // router-only
  becauseHint?: string;    // engine may rewrite to one sentence
}
```

### `RankedCandidate` (probability input)

```typescript
{
  candidateId: string;
  rank: number;      // 1-based
  score: number;
  confidence: number; // 0..1
}
```

### `DecisionSurface` (engine output — UX ingress)

**Union of three modes:**

| Mode | When | UX |
|------|------|-----|
| `fork` | Ambiguity, WAITING, low confidence gap | ≤3 chips (default / alternative / escape) |
| `auto` | High confidence single path | Auto route to execution (no chip choice) |
| `blocked` | No legal candidates | Minimal escape or message |

**Fork** (Threadline kernel aligned):

```typescript
{
  mode: "fork";
  title: string;
  because: string;      // exactly one sentence
  targetState: "WAITING";
  chips: ForkChipSpec[]; // max 3
  maxChips: 3;
}
```

**Auto:**

```typescript
{
  mode: "auto";
  title: string;
  because: string;
  targetState: DeosCardState;
  action: CandidateAction;
  transition: StateTransitionRequest;
}
```

### `composeDecision(input)`

```typescript
type ComposeDecisionInput = {
  intent: UserIntent;
  state: DeosStateContext;
  candidates: CandidateAction[];
  probability: ProbabilityFieldOutput;
  title?: string;
};
```

**Returns:** `ComposeDecisionResult { surface, actionIds, composeVersion, diagnostics }`

---

## Pipeline (canonical)

```text
1. Intent Engine     → UserIntent
2. Plugin registry   → CandidateAction[]
3. Probability Field → rankCandidates() → ProbabilityFieldOutput
4. composeDecision() → DecisionSurface     ← ONLY decision authority
5. validateSurfaceTransition()
6. projectSurfaceToDecisionCard() → Threadline (optional)
7. Execution Router  → plugin payload
8. CausalProof       → record
```

---

## State machine (constraint only)

| From | Allowed to |
|------|------------|
| WAITING | WORKING, DEFERRED |
| WORKING | DONE, WAITING |
| DONE | WAITING |
| DEFERRED | WAITING |

`fork` mode holds `WAITING` (no illegal transition).  
`auto` must pass `validateStateTransition(transition)` or Engine falls back to `fork`.

---

## Selection policy (compose v1)

Inside `composeDecision` only (optional **`envelope` + `envelopeUsage`** → veto/filter before rank; see `compose-envelope-gate.ts`):


- **Fork** if: `cardState === WAITING` AND (score gap &lt; 0.15 OR date-picker OR gatePhase OR confidence &lt; 0.55)
- **Auto** otherwise if transition legal
- **Blocked** if no candidates
- **Defer** candidate injected into fork set when present

Plugins never change this policy—only supply candidates and scores.

---

## Threadline projection

`projectSurfaceToDecisionCard(surface)` maps:

- `fork` → `DecisionCard` with `chips[]`
- `auto` + DONE → settled line
- `blocked` → WAITING + escape chip

`resolvePayloadFromActionId(actionId, candidates)` maps chip tap → `ResolveChipPayload` for existing Event OS ingress.

---

## Code map

| Artifact | Path |
|----------|------|
| Types | `lib/deos/decision/decision-contract-types.ts` |
| Rank | `lib/deos/decision/rank-candidates.ts` |
| Compose | `lib/deos/decision/compose-decision.ts` |
| State validate | `lib/deos/decision/validate-state-transition.ts` |
| UX project | `lib/deos/decision/project-surface-to-threadline.ts` |
| OCR plugin material | `lib/deos/decision/ocr-plugin-candidates.ts` |
| Threadline compose | `lib/deos/decision/compose-threadline-card.ts` |
| Test | `npx tsx scripts/test-deos-decision-contract.ts` |
| Wiring test | `npx tsx scripts/test-threadline-deos-wiring.ts` |

---

## Versioning

| Component | Version key |
|-----------|-------------|
| Probability | `probability-v1` |
| Compose | `compose-v1` |
| Contract doc | 2026-06-01 |

Breaking changes to `DecisionSurface` shape require new compose version and Threadline adapter bump.

---

*Single decision authority: `composeDecision()`.*
