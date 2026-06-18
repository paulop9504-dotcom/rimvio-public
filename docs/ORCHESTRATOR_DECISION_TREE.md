# Orchestrator decision tree

Single routing model — no implicit phase jumps or scattered early returns.

## Entry (`runOrchestratorPipeline`)

```
buildOrchestratorPipelineBase(input)
  → resolveOrchestratorEarlyDecision(base)   // pre-pipeline tree
  → if hit: completeEarlyOrchestratorDecision
  → else: runOrchestratorStandardPipeline    // standard tree
```

## 1. Pre-pipeline tree (`resolve-orchestrator-decision.ts`)

First matching branch wins (fixed order). Replaces ~30 copy-pasted `if → shell → return` blocks.

### Probe modules (extracted)

Security/session probes live in `routing/probes/` and run first via `runPrePipelineProbes()`:

- `killSwitchProbe`, `piiSecurityProbe`, `contentPolicyProbe`, `sessionCorrectionProbe`

### Monolith (intentional — not yet split)

All other early-return branches remain in `resolve-orchestrator-decision.ts` until individually extracted. **Do not duplicate ordering** when adding probes — append to `PRE_PIPELINE_PROBE_ORDER` only for tier 0–2 security/session gates.

Examples (in order, after probes):

| Node | Former |
|------|--------|
| EventReviewDateResolution | OCR date review |
| OcrScheduleExtract | Composer attachment |
| **VitalityState** | Bare hunger/tired utterances — **before** commit gate |
| EventCommitGate | Slot/commit clarify (skips vitality utterances) |
| FallbackRecovery | Career/education recovery |
| ContextDrift* | PATCH2 drift |
| Meal / Place | Fast discovery |
| EventKernelOS | Terminal kernel OS |

Trace: pre-pipeline uses **phase 0** — `trace.hit(0, tier, label, detail)`. Terminal may be `EARLY_RETURN` or `KERNEL_OS`.

## 2. Standard tree (`run-orchestrator-standard-pipeline.ts`)

Replaces implicit **phase 1 / 2 / 3** routing:

| Step | Module | Former phase |
|------|--------|----------------|
| A | `runPhase1PrePipeline` — linear tier 0→5 + event detection | Phase 1 |
| B | `runPhase2Enrichment` — shadow, brain, retrieval | Phase 2 |
| C | `runPhase3Resolve` — vitality kernel, LLM/rules | Phase 3 |

Phase files remain as implementation detail; the **only** orchestration entry is the two trees above.

## Tier runners (step A internals)

Still implemented as `Phase1TierRunner[]` in `phase-1-pre-pipeline.ts`:

```
PRE_EVENT_TIER_TREE (0–2) → event detection → POST_EVENT_WORKFLOW_TREE (3–4) → POST_EVENT_DETERMINISTIC_TREE (5)
```

`runPhase1Tier` applies goal policy on tier 5 only.

## Files

| File | Role |
|------|------|
| `orchestrator-pipeline-base.ts` | Base context, early/standard finalize |
| `resolve-orchestrator-decision.ts` | Pre-pipeline decision tree (monolith + probe entry) |
| `routing/run-pre-pipeline-probes.ts` | Ordered tier 0–2 probe runner |
| `routing/probes/` | Extracted security/session probes |
| `run-orchestrator-standard-pipeline.ts` | Standard path tree |
| `run-orchestrator-pipeline.ts` | Thin entry (~25 lines) |
