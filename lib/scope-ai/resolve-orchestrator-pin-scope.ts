/**
 * Resolve orchestrator pin scope before LLM enrichment.
 * @see docs/RIMVIO_SCOPE_AI.md § Orchestrator routing
 */

import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import {
  getPinDomain,
  isPinDomainId,
} from "@/lib/globe/pin-domain-registry";
import type { PinScope } from "@/lib/globe/pin-entity";
import {
  readPinScopeFromComposerContext,
  readPinScopeHint,
  resolvePinScope,
} from "@/lib/scope-ai/resolve-pin-scope";

export type ResolveOrchestratorPinScopeInput = {
  message: string;
  composerContext?: string | null;
  /** Globe / pin sheet explicit hint — wins. */
  pinScopeHint?: PinScope | null;
};

function resolveBareExternalMention(message: string): PinScope | null {
  const bareToken = normalizeAtMentionInput(message.trim()).match(/^@(\S+)$/u);
  if (!bareToken?.[1]) {
    return null;
  }
  const feature = resolveMentionFeature(bareToken[1]);
  if (!feature) {
    return null;
  }
  return resolveMentionDefaultScope(feature.featureId);
}

function resolveMentionDefaultScope(featureId: string): PinScope | null {
  if (featureId === "gathering") {
    return resolvePinScope("external");
  }
  if (!isPinDomainId(featureId)) {
    return null;
  }
  const def = getPinDomain(featureId);
  if (def.defaultScope === "external") {
    return resolvePinScope("external");
  }
  return null;
}

function resolveMentionPinScope(message: string): PinScope | null {
  const bare = resolveBareExternalMention(message);
  if (bare) {
    return bare;
  }
  const mention = parseActionMention(message.trim());
  if (!mention) {
    return null;
  }
  return resolveMentionDefaultScope(mention.feature.featureId);
}

export function resolveOrchestratorPinScope(
  input: ResolveOrchestratorPinScopeInput,
): PinScope {
  const hinted = readPinScopeHint(input.pinScopeHint);
  if (hinted) {
    return hinted;
  }

  const fromMention = resolveMentionPinScope(input.message);
  if (fromMention) {
    return fromMention;
  }

  const fromComposer = readPinScopeFromComposerContext(input.composerContext);
  if (fromComposer) {
    return fromComposer;
  }

  return resolvePinScope("internal");
}
