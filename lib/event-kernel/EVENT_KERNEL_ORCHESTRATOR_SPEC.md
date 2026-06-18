# Execution Orchestrator

Execution layer of the Event Kernel system.

**Does NOT** decide intent.
**Does NOT** compute entropy.
**Does NOT** re-interpret the user.

**ONLY** executes the decision produced by the Kernel.

See: `EVENT_KERNEL_SPEC.md`

---

## 1. Input

Kernel output (immutable):

```json
{
  "frame": { "entities", "intent_hint", "modifiers" },
  "micro_intent": { "CONTINUE", "QUERY", "SHIFT", "ACK", "CLOSE", "PASSIVE" },
  "entropy": 0,
  "decision": "DIRECT_ACTION | OPTIONS | CLARIFY",
  "response_hint": ""
}
```

Must NOT modify this data.

Runtime attachment (execution-only, not re-decision):

- `actions` — pre-built option list for OPTIONS (max 3)

---

## 2. Role

Convert Kernel decisions into:

- search execution (delegate)
- response generation (from `response_hint`)
- option building (from pre-built actions)
- clarification question (from `response_hint`)

Pure execution layer.

---

## 3. Decision Handling

### DIRECT_ACTION

- QUERY → delegate search / retrieval
- CONTINUE → delegate continuation
- ACK → short acknowledgment (`response_hint`)
- CLOSE → short acknowledgment (`response_hint`)
- SHIFT → delegate pivot
- PASSIVE → hold (`response_hint`)

### OPTIONS

Max 3 options. No explanation. Bullet format from pre-built actions.

### CLARIFY

ONE question from `response_hint` only.

---

## 4. Continuity

Maintain context from frame. No reset unless CLOSE or strong SHIFT. PASSIVE = hold.

---

## 5. Output Style

Minimal. Fast. Clean. No analysis. No reasoning. No system language.

---

## 6. System Principle

Not intelligent. Deterministic execution of a prior decision.

---

## 7. Design Goal

"A system that reacts instantly and correctly without thinking again."
