# Intent Routing Kernel

Classifies user input into a single execution state and routing behavior.

**Does NOT** answer the user directly (Render phase only).

See: `EVENT_KERNEL_SPEC.md`, `EVENT_KERNEL_ORCHESTRATOR_SPEC.md`.

---

## 1. Core States

| State | Trigger | Route |
|---|---|---|
| **ACK** | standalone confirmation | context-dependent |
| **CONTINUE** | ACK after QUESTION/PROPOSAL | `DELEGATE_CONTINUE` |
| **DIRECT_ACTION** | explicit query | `BUSINESS_LOOKUP` / `GENERAL_SEARCH` |
| **CLARIFY** | ambiguous deictic / high entropy | `CLARIFY` |
| **TERMINAL_ACK** | standalone ack, no continuation | `TERMINAL_ACK` |

---

## 2. Deictic Recall Layer

If input contains `그거`, `이거`, `아까`:

1. Attempt resolve from memory / history / link
2. If confidence ≥ 0.7 → `DIRECT_ACTION`
3. Else → `CLARIFY_A`

---

## 3. Execution Routing

- entity + attribute → `BUSINESS_LOOKUP`
- else → `GENERAL_SEARCH`

---

## 4. Output Format

```json
{
  "intent": "...",
  "state": "...",
  "route": "...",
  "confidence": 0.85,
  "notes": ""
}
```

No natural language response.

---

## 5. Pipeline Position

```
INPUT → KERNEL → MEMORY → ROUTING → SEARCH PLAN → EXECUTION → RENDER
```

Routing reads Kernel wire + memory. Does not re-classify micro-intent.
