/** Life-axis vitality tags — schema-first; logic attaches later. */
export type VitalityTag = "Apex" | "Haven" | "Nexus" | "Sentinel";

export const DEFAULT_VITALITY_TAG: VitalityTag = "Nexus";

export const VITALITY_TAG_VALUES: VitalityTag[] = [
  "Apex",
  "Haven",
  "Nexus",
  "Sentinel",
];

export type VitalityPreset = {
  tag: VitalityTag;
  title: string;
  goal: string;
  subtitle: string;
};

export const VITALITY_PRESETS: Record<VitalityTag, VitalityPreset> = {
  Apex: {
    tag: "Apex",
    title: "업무·집중",
    goal: "결과물·수익·실력 향상 — 산출물이 나오는 활동",
    subtitle: "업무",
  },
  Haven: {
    tag: "Haven",
    title: "휴식·리charge",
    goal: "나 혼자의 에너지 회복·개인 정비",
    subtitle: "휴식",
  },
  Nexus: {
    tag: "Nexus",
    title: "관계·연결",
    goal: "타인과의 소통·관계 맺기 — 상호작용이 핵심인 활동",
    subtitle: "관계",
  },
  Sentinel: {
    tag: "Sentinel",
    title: "경고·모니터링",
    goal: "기한·위기 방지 — 지금 안 하면 문제가 되는 활동",
    subtitle: "경고",
  },
};

export function isVitalityTag(value: string): value is VitalityTag {
  return VITALITY_TAG_VALUES.includes(value as VitalityTag);
}

export function normalizeVitalityTag(value: unknown): VitalityTag {
  if (typeof value === "string" && isVitalityTag(value)) {
    return value;
  }
  return DEFAULT_VITALITY_TAG;
}
