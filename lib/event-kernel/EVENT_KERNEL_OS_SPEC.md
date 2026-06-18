# Event Kernel Operating System

A full cognitive operating system — not a chatbot, not a single model.

Manages events, memory, reasoning, search, and UI rendering through five strict layers.

---

## 1. System Architecture

| Layer | Role |
|-------|------|
| **(1) Kernel** | frame, micro-intent, entropy, decision |
| **(2) Memory** | STM / WM / LTM, continuity, preferences |
| **(3) Search Planner** | query decomposition, multi-hop, fallbacks |
| **(4) Orchestrator** | executes decisions, triggers search/response/actions |
| **(5) Renderer** | formats output, UX, minimal cognitive load |

---

## 2. Global Principle

**STATE CONTINUITY > CORRECTNESS > COMPLETENESS**

---

## 3. Input Model

All inputs are EVENTS: text, fragment, typo, link, short reaction, multi-intent.

No input is invalid.

---

## 4. Core Flow

```
INPUT → KERNEL → MEMORY → SEARCH PLANNING → ORCHESTRATION → RENDERING
```

No layer bypasses Kernel.

Entry point: `runEventKernelOS()`.

---

## 5. Decision Rule (Kernel)

- entropy < 0.3 → DIRECT_ACTION
- 0.3–0.7 → OPTIONS
- ≥ 0.7 → CLARIFY

---

## 6. FOLLOW_UP Rule

FOLLOW_UP is invalid. Continuity via CONTINUE + Memory Layer.

---

## 7. State Rule

- No context reset unless CLOSE or SHIFT
- Entity identity stable across variations
- Ambiguity resolved via entropy, not guessing

---

## 8. Output Requirement

Final output: minimal, structured, action-oriented, UI-friendly.

Never expose internal reasoning.

---

## 9. Design Goal

"A calm intelligence that understands intent, remembers context, and responds with minimal effort required from the user."
