import { isKnownCommandOsToken } from "@/lib/command-os/command-os-tokens";
import { parseCommandInput } from "@/lib/command-os/parse-command-input";
import {
  buildMentionContextKey,
  resolveMentionFeature,
  type MentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

export type ParsedActionMention = {
  featureToken: string;
  feature: MentionFeature;
  query: string;
  rawInput: string;
  /** Message routed to orchestrator / contract gate (query body only). */
  routingMessage: string;
  contextKey: string;
};

export function parseActionMention(raw: string): ParsedActionMention | null {
  const parsed = parseCommandInput(raw);
  if (!parsed) {
    return null;
  }
  if (isKnownCommandOsToken(parsed.command)) {
    return null;
  }

  const feature = resolveMentionFeature(parsed.command);
  if (!feature) {
    return null;
  }

  return {
    featureToken: parsed.command,
    feature,
    query: parsed.query,
    rawInput: parsed.rawInput,
    routingMessage: parsed.query,
    contextKey: buildMentionContextKey(feature),
  };
}

export function isActionFeatureMentionInput(raw: string): boolean {
  return parseActionMention(raw) !== null;
}

export function formatMentionComposerBlock(mention: ParsedActionMention): string {
  return [
    "[@mention]",
    `featureId: ${mention.feature.featureId}`,
    `sourceRef: ${mention.feature.sourceRef}`,
    `contextKey: ${mention.contextKey}`,
    mention.feature.action ? `action: ${mention.feature.action}` : "action: (nl)",
    `query: ${mention.query}`,
  ].join("\n");
}
