import {
  parseContextUnderstandingWire,
  type ContextUnderstandingWire,
} from "@/lib/context-understanding/parse-context-understanding-wire";
import { sanitizePluginId } from "@/lib/plugin-registry/resolve-plugin";
import type { CandidateDomain } from "@/lib/llm-action-candidate-generator/types";
import type {
  LlmActionCandidateWire,
  LlmCandidateGeneratorWire,
} from "@/lib/llm-action-candidate-generator/types";

export function parseLlmCandidateGeneratorWire(raw: unknown): LlmCandidateGeneratorWire | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || !("action_candidates" in parsed)) {
    return null;
  }

  const wire = parsed as LlmCandidateGeneratorWire;
  if (!Array.isArray(wire.action_candidates)) {
    return null;
  }

  return wire;
}

export function normalizeLlmCandidates(input: {
  ecId: string;
  domain: CandidateDomain;
  wire: LlmCandidateGeneratorWire;
}): LlmActionCandidateWire[] {
  const out: LlmActionCandidateWire[] = [];

  for (const [index, item] of input.wire.action_candidates.entries()) {
    const label = item.label?.trim();
    if (!label) {
      continue;
    }

    out.push({
      id: `${input.ecId}:llm-cand:llm:${index}`,
      label,
      plugin: sanitizePluginId(item.plugin, input.domain),
      category_hint: item.category_hint === "main" ? "main" : "auxiliary",
      reason: item.reason?.trim() || "llm suggested contextual action",
      source: "llm",
    });
  }

  return out.slice(0, 8);
}

export function mergeCandidatePools(
  primary: LlmActionCandidateWire[],
  secondary: LlmActionCandidateWire[],
): LlmActionCandidateWire[] {
  const seen = new Set<string>();
  const merged: LlmActionCandidateWire[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = `${item.label}::${item.plugin}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 10);
}

export { type ContextUnderstandingWire, parseContextUnderstandingWire };
