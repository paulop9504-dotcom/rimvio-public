import type { MeaningEdgeKind } from "@/lib/meaning/meaning-types";
import { MEANING_STRONG_FREQUENCY } from "@/lib/meaning/meaning-types";

const INTENT_LABELS: Record<string, string> = {
  wedding: "결혼식",
  travel: "여행",
  business: "출장",
  meeting: "만남",
  birthday: "생일",
  hospital: "병원",
  school: "학교",
  sports: "운동",
  family: "가족",
  date: "데이트",
  food: "맛집",
  concert: "공연",
  funeral: "장례",
};

function displayExperience(key: string): string {
  return INTENT_LABELS[key] ?? key;
}

export function formatMeaningLabel(input: {
  kind: MeaningEdgeKind;
  fromLabel: string;
  toLabel: string;
  frequency: number;
}): string {
  const { kind, fromLabel, toLabel, frequency } = input;
  const strong = frequency >= MEANING_STRONG_FREQUENCY;

  switch (kind) {
    case "person_place":
      return strong ? `${fromLabel} = ${toLabel}` : `${fromLabel} · ${toLabel}`;
    case "person_experience":
      return strong
        ? `${fromLabel} = ${displayExperience(toLabel)}`
        : `${fromLabel} · ${displayExperience(toLabel)}`;
    case "place_experience":
      return strong
        ? `${fromLabel} = ${displayExperience(toLabel)}`
        : `${fromLabel} · ${displayExperience(toLabel)}`;
    case "person_person":
      return strong ? `${fromLabel} ↔ ${toLabel}` : `${fromLabel} · ${toLabel}`;
    default:
      return `${fromLabel} · ${toLabel}`;
  }
}
