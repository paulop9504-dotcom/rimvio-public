import { ACTION_INTENT_REGISTRY } from "@/lib/action-dispatcher/registry";
import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";

export type GlobeComposerActionResult = {
  label: string;
  url: string;
  featureId: string;
};

/** Run @action from globe ingest bar — deterministic, no LLM. */
export function runGlobeComposerAction(raw: string): GlobeComposerActionResult | null {
  const mention = parseActionMention(raw.trim());
  if (!mention?.feature.action?.trim()) {
    return null;
  }

  const actionId = mention.feature.action.trim();
  const definition = ACTION_INTENT_REGISTRY[actionId];
  if (!definition) {
    return null;
  }

  const query = mention.query.trim();
  const paramKey = definition.params[0] ?? "dest";
  const url = definition.buildUrl({ [paramKey]: query, dest: query, destination: query });
  if (!url) {
    return null;
  }

  return {
    label: definition.label,
    url,
    featureId: mention.feature.featureId,
  };
}
