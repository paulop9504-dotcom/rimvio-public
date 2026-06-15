import {
  listMentionFeatures,
  type MentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

/** How a registry feature enters the Action OS spine. */
export type MentionIngressKind =
  | "contract_orchestrator"
  | "local_turn"
  | "mention_action_bundle";

const LOCAL_TURN_IDS = new Set([
  "timer",
  "reminder",
  "navigate",
  "schedule",
  "transfer",
  "parking",
  "focus",
  "linksheet",
  "end_peer_talk",
]);

export function resolveMentionIngressKind(
  feature: MentionFeature,
): MentionIngressKind {
  if (LOCAL_TURN_IDS.has(feature.featureId)) {
    return "local_turn";
  }
  if (feature.action?.trim()) {
    return "contract_orchestrator";
  }
  return "mention_action_bundle";
}

export type MentionRegistryIngressRow = {
  featureId: string;
  displayName: string;
  action: string | null;
  ingress: MentionIngressKind;
  contextKey: string;
};

export function buildMentionRegistryIngressReport(): MentionRegistryIngressRow[] {
  return listMentionFeatures().map((feature) => ({
    featureId: feature.featureId,
    displayName: feature.displayName,
    action: feature.action ?? null,
    ingress: resolveMentionIngressKind(feature),
    contextKey: `event.${feature.category}.${feature.sourceRef}`,
  }));
}

export function findMentionRegistryGaps(): string[] {
  const gaps: string[] = [];
  for (const feature of listMentionFeatures()) {
    if (feature.aliases.length === 0) {
      gaps.push(`${feature.featureId}: no aliases`);
    }
  }
  return gaps;
}
