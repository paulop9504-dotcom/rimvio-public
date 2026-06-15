# Event Kernel Search Planner

Designs multi-step search and reasoning paths from Event Kernel state.

**Does NOT** execute search.
**ONLY** designs how to search and what to search.

---

## 1. Input

- frame
- micro-intent distribution
- entropy
- memory state (STM / WM / LTM)
- user query or event

---

## 2. Core Responsibility

Convert user intent into:

- search strategy
- query decomposition
- multi-hop reasoning plan (if needed)
- refinement loop strategy

---

## 3. Search Strategy Types

| Type | When |
|------|------|
| **SIMPLE** | single query, high confidence, low entropy |
| **EXPANDED** | multiple variants, medium entropy |
| **MULTI_HOP** | step chain, high entropy or unclear intent |

---

## 4. Query Generation Rules

- canonical query (clean intent)
- expanded queries (variations)
- fallback queries (robustness)

Entity preservation over keyword transformation.

---

## 5. Multi-Hop Planning

Steps: define entity → gather context → refine condition → finalize source.

---

## 6. Memory Integration

Reuse known entities, avoid redundant searches, bias toward preferences.

---

## 7. Entropy Awareness

- low → 1 query
- medium → 2–3 queries
- high → multi-hop + clarification suggestion

---

## 8. Output Format

```json
{
  "search_type": "SIMPLE | EXPANDED | MULTI_HOP",
  "canonical_query": "",
  "expanded_queries": [],
  "fallback_queries": [],
  "multi_hop_steps": [],
  "memory_bias": [],
  "notes": ""
}
```

---

## 9. Design Goal

Turn unclear human intent into a structured search strategy that guarantees retrieval success.
