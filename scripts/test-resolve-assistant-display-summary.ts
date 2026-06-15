#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveAssistantDisplaySummary } from "../lib/action-chat/resolve-assistant-display-summary";

assert.equal(
  resolveAssistantDisplaySummary({
    summary: "",
    experienceChoice: {
      headline: "배고프시군요.",
      mode: "BALANCED",
      action: "ASK_CHOICE",
      options: [],
    },
  }),
  "배고프시군요."
);
assert.equal(
  resolveAssistantDisplaySummary({
    summary: "",
    entityQuickPick: {
      entity: "애플",
      lead: "애플 — 뉴스, 제품, 채용 중에서 골라보세요.",
      options: [],
    },
  }),
  "애플 — 뉴스, 제품, 채용 중에서 골라보세요."
);
assert.equal(
  resolveAssistantDisplaySummary(null).startsWith("안녕"),
  true
);

console.log("test-resolve-assistant-display-summary: ok");
