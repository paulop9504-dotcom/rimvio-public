/**
 * Context Generator (Backend)
 * System Prompt = Base Prompt + Active Chains Persona + Capability List
 */

import {
  mergeActiveChainsPersona,
  normalizeActiveChains,
  resolveCanonicalPreset,
  unionCapabilities,
  type CanonicalContainerKey,
} from "@/lib/containers/container-types";

export type GeneratedChainContext = {
  activeChains: CanonicalContainerKey[];
  activeChainsPersona: string;
  capabilityList: ReturnType<typeof unionCapabilities>;
  hybridLabel: string;
};

const CHAINING_RULES = `# [CONTEXT CHAINING]
- activeChains 배열 순서가 우선순위입니다. (앞쪽 key가 주도권)
- Persona Merge와 Capability Union을 동시에 적용하십시오.`;

export function resolveActiveChainsFromPayload(input: {
  activeChains?: string[] | null;
  legacyChainIds?: string[] | null;
}): CanonicalContainerKey[] {
  if (input.activeChains?.length) {
    return normalizeActiveChains(input.activeChains);
  }
  if (input.legacyChainIds?.length) {
    return normalizeActiveChains(input.legacyChainIds);
  }
  return [];
}

export function generateChainContext(activeChains: string[]): GeneratedChainContext | null {
  const keys = normalizeActiveChains(activeChains);
  if (keys.length === 0) {
    return null;
  }

  return {
    activeChains: keys,
    activeChainsPersona: mergeActiveChainsPersona(keys),
    capabilityList: unionCapabilities(keys),
    hybridLabel: keys
      .map((key) => resolveCanonicalPreset(key).title)
      .join(" × "),
  };
}

export function buildActiveChainsPersonaBlock(context: GeneratedChainContext): string {
  const entries = context.activeChains.map((key, index) => {
    const preset = resolveCanonicalPreset(key);
    return `${index + 1}. ${key} (${preset.title}): ${preset.persona}`;
  });

  return `# [ACTIVE_CHAINS_PERSONA]
activeChains = ${JSON.stringify(context.activeChains)}

merged_persona:
${context.activeChainsPersona}

per_container:
${entries.join("\n")}`;
}

export function buildCapabilityListBlock(context: GeneratedChainContext): string {
  return `# [CAPABILITY_LIST]
allowed_actions_union = ${JSON.stringify(context.capabilityList)}

- 이 목록 외 행동은 제안하거나 실행하지 마십시오.
- 허용되지 않은 요청은 summary에 "현재 컨테이너에서는 지원하지 않는 기능입니다"라고 답하고 actions=[]로 반환하십시오.`;
}

export function generateChainedSystemPrompt(input: {
  basePrompt: string;
  activeChains: string[];
}): string {
  const context = generateChainContext(input.activeChains);
  if (!context) {
    return input.basePrompt;
  }

  const parts = [
    input.basePrompt,
    CHAINING_RULES,
    buildActiveChainsPersonaBlock(context),
    buildCapabilityListBlock(context),
  ];

  return parts.join("\n\n");
}

export function buildActiveChainsWireFromKeys(activeChains: string[]) {
  const context = generateChainContext(activeChains);
  if (!context) {
    return [];
  }

  return [
    {
      chain_id: `chain-${context.activeChains.join("-")}`,
      priority_order: context.activeChains,
      containers: context.activeChains.map((key) => {
        const preset = resolveCanonicalPreset(key);
        return {
          container_id: key,
          title: preset.title,
          persona: preset.persona,
          allowed_actions: preset.allowedActions,
        };
      }),
      merged_persona: context.activeChainsPersona,
      allowed_actions_union: context.capabilityList,
      hybrid_label: context.hybridLabel,
    },
  ];
}
