# Event Kernel Memory System

Maintains long-term and short-term memory for the Event Kernel.

**Does NOT** decide intent.
**Does NOT** execute actions.
**ONLY** manages memory continuity and relevance.

---

## 1. Input

- EventKernelState
- user input event
- current frame
- micro-intent distribution
- previous memory state

Integrated into a unified memory structure.

---

## 2. Memory Types

### Short-Term Memory (STM)
Last 3–8 events, active context, current topic flow.

### Working Memory (WM)
Current session state, active entities, unresolved intents.

### Long-Term Memory (LTM)
Repeated entities, stable preferences, recurring behaviors.

---

## 3. Memory Update Rules

1. **Reinforce repetition** — repeated entity/intent strengthens weight
2. **Decay inactivity** — unused items lose importance
3. **No duplication** — same meaning under one normalized key

---

## 4. State Continuity

- Context never resets unless CLOSE or strong SHIFT
- Entity identity stable across typos/variations
- Intent continuity preserved for short utterances

---

## 5. Memory Compression

When STM grows: merge similar events, compress redundant history, preserve meaning not raw text.

---

## 6. Output Format

```json
{
  "stm": [],
  "wm": [],
  "ltm": [],
  "active_links": [],
  "decayed_items": []
}
```

---

## 7. Design Goal

"Make the system feel like it remembers what matters, and forgets noise naturally."
