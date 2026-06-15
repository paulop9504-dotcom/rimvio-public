import type {
  VitalityStateKind,
  VitalityStateProtocol,
} from "@/lib/vitality-state/vitality-state-types";
import type { VitalityTag } from "@/lib/vitality/types";

export type VitalityStateRegistryEntry = {
  kind: VitalityStateKind;
  vitality: VitalityTag;
  protocol: VitalityStateProtocol;
  label: string;
  /** LLM guidance — examples are hints only, not exhaustive. */
  description: string;
};

/** Single source of truth: kind → axis + protocol. LLM picks kind; code picks protocol. */
export const VITALITY_STATE_REGISTRY: VitalityStateRegistryEntry[] = [
  {
    kind: "hunger",
    vitality: "Haven",
    protocol: "food_discovery",
    label: "배고픔",
    description:
      "User wants food or feels hungry. Examples: 배고파, 먹고 싶어, 밥 뭐 먹지 — not a place name.",
  },
  {
    kind: "energy_depletion",
    vitality: "Haven",
    protocol: "haven_schedule_relief",
    label: "에너지 고갈",
    description:
      "Tired, exhausted, needs rest. Examples: 피곤해, 지쳤어, 쉬고 싶어, 녹초.",
  },
  {
    kind: "overload",
    vitality: "Sentinel",
    protocol: "sentinel_pause",
    label: "과부하",
    description:
      "Stress, overwhelm, loss of control. Examples: 스트레스, 머리 아파, 한계, 미칠 것 같아.",
  },
  {
    kind: "priority_confusion",
    vitality: "Apex",
    protocol: "apex_golden_path",
    label: "우선순위 혼란",
    description:
      "Does not know what to do first. Examples: 뭐부터 해야 하지, 막막해, 정신없어.",
  },
  {
    kind: "relationship_longing",
    vitality: "Nexus",
    protocol: "nexus_connect",
    label: "관계 갈망",
    description:
      "Lonely, wants connection. Examples: 외로워, 보고 싶어, 연락하고 싶어.",
  },
  {
    kind: "urgency_pressure",
    vitality: "Sentinel",
    protocol: "sentinel_conflict_resolve",
    label: "긴급 압박",
    description:
      "Time pressure, crisis feeling. Examples: 시간이 없어, 망했어, 늦었어, 바빠 죽겠어.",
  },
  {
    kind: "stimulation_lack",
    vitality: "Haven",
    protocol: "haven_activity_suggest",
    label: "자극 부족",
    description: "Bored, nothing to do. Examples: 심심해, 뭐 하지, 할 게 없어.",
  },
  {
    kind: "thirst",
    vitality: "Haven",
    protocol: "haven_hydrate",
    label: "목마름",
    description: "Thirsty, wants water or drinks. Examples: 목말라, 갈증.",
  },
  {
    kind: "sleepiness",
    vitality: "Haven",
    protocol: "haven_rest",
    label: "수면 필요",
    description: "Sleepy, needs sleep. Examples: 졸려, 잠 와.",
  },
  {
    kind: "anxiety",
    vitality: "Sentinel",
    protocol: "sentinel_calm",
    label: "불안",
    description: "Anxious, worried, tense. Examples: 불안해, 걱정돼, 초조해.",
  },
  {
    kind: "generic_state",
    vitality: "Haven",
    protocol: "state_router",
    label: "상태",
    description: "Fallback when state is clear but kind is ambiguous.",
  },
];

const KIND_INDEX = new Map(
  VITALITY_STATE_REGISTRY.map((entry) => [entry.kind, entry])
);

export function resolveVitalityStateFromKind(
  kind: VitalityStateKind,
  confidence: number
) {
  const entry = KIND_INDEX.get(kind);
  if (!entry) {
    return null;
  }
  return {
    kind: entry.kind,
    vitality: entry.vitality,
    protocol: entry.protocol,
    label: entry.label,
    confidence,
  };
}

export function isVitalityStateKind(value: string): value is VitalityStateKind {
  return KIND_INDEX.has(value as VitalityStateKind);
}
