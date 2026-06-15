import { buildLifeDomainActions } from "@/lib/life-domain-actions/build-actions";
import {
  detectLifeDomain,
  isLifeDomainBoardRequest,
  resolveLifeDomainLabel,
} from "@/lib/life-domain-actions/detect-domain";
import { LIFE_DOMAIN_BY_KEY } from "@/lib/life-domain-actions/catalog";
import type { LifeDomainKey } from "@/lib/life-domain-actions/types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

function buildLifeDomainResult(domain: LifeDomainKey): OrchestratorResult {
  const entry = LIFE_DOMAIN_BY_KEY[domain];
  const actions = buildLifeDomainActions(domain);

  return {
    summary: `**${entry.subtitle}**에서 바로 쓸 수 있는 액션이에요. 필요한 걸 골라주세요.`,
    actions,
    source: "rules",
    confidence: 0.9,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      semantic_reason: "life_domain_actions",
      life_domain: domain,
    },
  };
}

/** Deterministic life-domain action board (Study / Work / Travel / …). */
export function orchestrateLifeDomainActions(message: string): OrchestratorResult | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const domain = detectLifeDomain(trimmed);
  if (domain) {
    return buildLifeDomainResult(domain);
  }

  if (isLifeDomainBoardRequest(trimmed)) {
    return buildLifeDomainResult("daily_life");
  }

  return null;
}

export function orchestrateLifeDomainByKey(domain: LifeDomainKey): OrchestratorResult {
  return buildLifeDomainResult(domain);
}

export { resolveLifeDomainLabel };
