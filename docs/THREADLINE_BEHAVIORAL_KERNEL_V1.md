# Threadline Behavioral Kernel v1

**Status:** SHIP (kernel spec) · ITERATE (product surfaces)  
**Scope:** Behavioral runtime only — not UI exploration, not backend architecture.

---

## Verdict

| Layer | Decision |
|-------|----------|
| **Kernel v1** | **SHIP** — frozen contract below |
| **Product** | **ITERATE** — Review delta sheet, snooze recovery, v1.1 discovery |

---

## 0. System definition

Threadline is a **single-screen Decision OS**:

- Every user action is a **Resolve moment** (or creates one via **Add**).
- Every item is a **Decision Card**.
- Every card is **stuck, processing, done, or deferred** in time.
- The system exists **only** to reduce cognitive load and clear stuck states.

**Primary principle:** Forward resolve only.

**One-sentence model:** User opens Today Thread, resolves the one stuck card with a single chip tap, optionally adds a new stuck moment via input, and may later peek at what changed on settled cards.

---

## 1. Behavioral model constraint

### 1.1 Default intention (only)

> **Resolve what is currently stuck in my day.**

### 1.2 Allowed intents (exhaustive)

| Intent | Role | Daily? |
|--------|------|--------|
| **Resolve** | State transition on waiting card | Yes |
| **Add** | New waiting card via input | Secondary |
| **Review** | Read-only delta after done | Optional |

No fourth intent. No exploration, replay, or command-mode as separate intents (`@` is **Add** syntax).

### 1.3 Forbidden intents (v1)

- Explore unchosen branches (ghost)
- Reconstruct timeline (split replay)
- Mutate state from reflection (apply-from-review)
- Understand system internals (proof, graph, queue)

---

## 2. Action system (strict)

### 2.1 RESOLVE (primary)

| Field | Value |
|-------|--------|
| Trigger | Tap fork chip |
| When | `WAITING` only |
| Effect | `WAITING → WORKING → DONE` or `WAITING → DEFERRED` |
| Loop | Only daily action required for value |

### 2.2 ADD (primary, secondary frequency)

| Field | Value |
|-------|--------|
| Trigger | Input bar submit (text / `@` / attachment) |
| Effect | Create or bind **new** `WAITING` card |
| Note | Same bar, no command palette |

### 2.3 REVIEW (secondary)

| Field | Value |
|-------|--------|
| Trigger | `⋯` on `DONE` card only |
| Effect | Show **What changed** (≤3 delta rows, read-only) |
| Must not | Re-run, edit calendar, or change card state |

---

## 3. Interaction collapse rules

1. Merge interactions that produce the **same** state transition.
2. Remove interactions expected **&lt;80%** usage (long-press, swipe, ghost, split in v1).
3. One **primary** action per state; weaker competitor **removed**.
4. Exploration surfaces **deferred** to v1.1+ under Review only.

---

## 4. State model

```
ADD ──► WAITING ──[Resolve chip]──► WORKING ──► DONE
           │
           └──[Not now]──► DEFERRED (off Today Thread)
```

### 4.1 WAITING

- **Primary:** Resolve (tap chip only).
- **Visible:** Title, Because, ≤3 chips (Default · Alternative · Not now).
- **Rail:** Amber.

### 4.2 WORKING

- **Primary:** None (user waits).
- **Visible:** Title, Because (optional short), no chips.
- **Rail:** Blue, &lt;1s typical.
- **Duration:** System-only; no user tap.

### 4.3 DONE

- **Primary:** None.
- **Visible:** Title, Because, settled line (no chips).
- **Secondary:** `⋯` → Review (optional).
- **Rail:** Green.

### 4.4 DEFERRED (policy lock)

**`Not now` → DEFERRED** (not DONE).

- Card **leaves** Today Thread immediately.
- Does **not** count toward “Needs one tap”.
- Recovery: **Add** or future inbox strip (v1.1) — not v1 kernel.

---

## 5. UI surface constraints (v1)

### 5.1 Screens

- **One screen:** Today Thread.
- **One overlay:** Delta sheet (Review only).

### 5.2 Decision Card (fixed slots)

| Slot | Rule |
|------|------|
| Title | What this is about |
| Because | Exactly **one** sentence |
| Next | **XOR:** chips (`WAITING`) **or** settled line (`DONE`) |
| Left rail | Only state color — no duplicate status chip |

### 5.3 Forbidden in v1 build

- Ghost sheet
- Split replay modal
- Faded post-choice chips
- State chips
- Step expansion under Because
- Long-press / swipe as **primary** paths
- Second full-screen routes

---

## 6. Cognitive load

At any instant:

- **1** decision context (dominant `WAITING` if any)
- **1** dominant action (chip tap)
- **≤3** visible options (chips)

Overflow → hide or remove, never explain.

---

## 7. Fork system

- Active **only** in `WAITING`.
- Max **3:** Default · Alternative · Not now.
- Chips **removed** on transition (no fade).
- **No** forks on `DONE` / `WORKING` / `DEFERRED`.

---

## 8. Because (causal copy)

- One sentence.
- No steps, no technical terms, no proof metadata.
- Answers: *Why is this stuck, processing, or resolved?*
- Backend maps `CausalProof` → template; UI never exposes engine fields.

---

## 9. Review

- Optional, hidden behind `⋯` on `DONE` only.
- Delta-only: e.g. `Date: — → Jun 3`, `Calendar: off → on`.
- **No** state mutation, **no** re-execution.

---

## 10. Success criteria (kernel SHIP gate)

| # | Criterion |
|---|-----------|
| 1 | Core loop operable with **tap only** |
| 2 | RESOLVE is dominant daily action |
| 3 | ADD is secondary |
| 4 | REVIEW is optional curiosity |
| 5 | No competing primary gestures in core loop |
| 6 | No feature requires tutorial to complete first resolve |

---

## 11. Allowed / forbidden interactions

### Allowed

| ID | Action | Trigger |
|----|--------|---------|
| R1–R3 | Resolve | Tap chip (`WAITING`) |
| A1 | Add | Input submit |
| P0 | Scroll | Thread |
| V1 | Review | `⋯` on `DONE` |

### Forbidden

Long-press, swipe-on-card, ghost, split, faded chips, state chips, step expand, apply-from-review, fork on non-waiting, chips+settled line together, proof/log/graph UI.

---

## 12. Validation checklist (14/14 for kernel SHIP)

- [ ] Tap-only WAITING→DONE
- [ ] Resolve dominant in sessions
- [ ] Only Resolve / Add / Review intents
- [ ] WAITING: one primary (chip)
- [ ] WORKING: zero actions
- [ ] DONE: no chips; `⋯` optional
- [ ] ≤3 chips; gone after leave WAITING
- [ ] Because: one sentence, no engine terms
- [ ] Review: read-only deltas
- [ ] No forbidden UI in build
- [ ] One dominant WAITING + ≤3 options
- [ ] First resolve &lt;60s without tutorial
- [ ] Next slot XOR
- [ ] No competing state transitions per state

---

## 13. Product ITERATE backlog (post-kernel)

| Item | Version | Status |
|------|---------|--------|
| Review delta sheet (`⋯` → delta) | v1.1 | **Shipped** |
| DEFERRED recovery strip | v1.1 | **Shipped** — `DeferredRecoveryStrip` |
| OCR seed card (pre-proof) | v1.1 | **Shipped** — `card:ocr-active` |
| Execution timeline spine | v1.1 | **Shipped** — `ExecutionTimeline` |
| Ghost OR split (not both) | v2 | Pending |
| Command shortcuts UX | v1.1 | **Shipped** — `CommandShortcutStrip` on `@` |

**Do not** ship ghost + split + fork fade in the same release as kernel v1.

---

## 14. Decision authority (DEOS)

Threadline chips and Because lines must originate from **`composeDecision()`** only.

See **[DEOS_DECISION_CONTRACT.md](./DEOS_DECISION_CONTRACT.md)** — `CandidateAction`, `RankedCandidate`, `DecisionSurface`.

---

## 15. Engineering mapping (Event OS backend)

Kernel UI maps to existing engine; user never sees:

| Kernel | Engine (internal) |
|--------|-------------------|
| Because | `CausalProof` → narrative template |
| Resolve | `enqueueReviewExecution` → orchestrator |
| Review | Delta projection from proof `stateDiff` / `uiDiff` |
| DEFERRED | Client-only v1; no SSOT commit |

---

## 16. Implementation map (shipped)

| Kernel | Code |
|--------|------|
| Types / guards | `lib/threadline/` |
| OCR seed | `lib/threadline/seed-ocr-waiting-card.ts` |
| UI | `components/threadline/` |
| Hook | `hooks/use-threadline.ts` |
| Feed wiring | `hooks/use-action-chat.ts`, `components/action-chat-feed.tsx` |
| Kernel test | `npx tsx scripts/test-threadline-kernel.ts` |
| v1.1 test | `npx tsx scripts/test-threadline-v11.ts` |
| DEOS wiring test | `npx tsx scripts/test-threadline-deos-wiring.ts` |
| Command shortcuts | `npx tsx scripts/test-command-shortcuts.ts` |
| Integration audit | `npx tsx scripts/audit-event-os-integration.ts` |

---

*Frozen: 2026-06-01 · Threadline Behavioral Kernel v1*
