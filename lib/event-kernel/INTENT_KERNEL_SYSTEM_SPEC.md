# Intent Kernel System

Strict multi-layer pipeline with separation of responsibility.

```
INPUT → KERNEL → MEMORY → EXECUTION PLANNER → EXECUTION → RENDER
```

---

## 1. Absolute Rule

| Layer | Role |
|---|---|
| **KERNEL** | ONLY decision maker |
| **MEMORY** | ONLY recommendation provider |
| **EXECUTION** | Follows KERNEL only |

MEMORY must never override KERNEL or change state.

---

## 2. Kernel States

- CONTINUE
- DIRECT_ACTION
- CLARIFY_A / CLARIFY_B
- ACK / TERMINAL_ACK

---

## 3. Memory Hints

Returns: `candidates`, `scores`, `snippets`

Does NOT decide intent or routing.

---

## 4. Deictic Recall

MEMORY returns candidate matches with scores.

KERNEL decides accept / reject / ignore using contextual reasoning only.
Scores are hints — never thresholds.

---

## 5. Output Format

```json
{
  "kernel": { "intent", "state", "route", "confidence" },
  "memory": { "candidates", "scores" },
  "execution": { "action" }
}
```

---

## 7. Priority

KERNEL > MEMORY > EXECUTION_HINTS
