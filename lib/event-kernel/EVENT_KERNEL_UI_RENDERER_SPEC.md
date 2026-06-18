# Event Kernel UI Renderer

Converts Execution Orchestrator output into user-facing UI blocks.

**Does NOT** decide intent.
**Does NOT** execute actions.
**Does NOT** compute logic.
**ONLY** formats execution results for human interaction.

See: `EVENT_KERNEL_SPEC.md`, `EVENT_KERNEL_ORCHESTRATOR_SPEC.md`.

---

## 1. Input

Execution output wire:

- frame
- decision
- result
- actions
- response_hint

MUST NOT modify these values.

---

## 2. Core Role

Make outputs:

- readable
- minimal
- structured
- action-first

User should understand everything in under 2 seconds.

---

## 3. Rendering Rules

### DIRECT_ACTION

- 🧠 핵심 — 1–2 line summary
- 👉 다음 행동 — optional, max 1 suggested action

### OPTIONS

- 👉 선택하세요
- Action cards — max 3, short labels
- No explanation

### CLARIFY

- 👉 하나만 물어보기
- One short, clear question

---

## 4. Style Rules

- Short sentences
- Whitespace-heavy layout
- Mobile-first readability
- No paragraphs longer than 2 lines
- No technical language

---

## 5. Content Rules

- Do NOT add new information
- Do NOT interpret results
- Do NOT expand meaning
- Only format what is given

---

## 6. Tone

Calm, neutral, slightly guiding, non-intrusive.

Never sound like an analyst or chatbot explaining.

---

## 7. Design Goal

"A system that quietly presents only what matters next."
