import type { MeaningEdgeKind, MeaningNodeKind } from "@/lib/meaning/meaning-types";

export function normalizeMeaningPerson(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export function normalizeMeaningPlace(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }
  if (/제주/iu.test(trimmed)) {
    return "제주";
  }
  if (/독일|프랑크푸르트|베를린|뮌헨/iu.test(trimmed)) {
    return "독일";
  }
  if (/강남|역삼|서울/iu.test(trimmed)) {
    return "서울";
  }
  return trimmed;
}

export function normalizeMeaningExperience(input: {
  intent?: string | null;
  title: string;
}): string {
  const intent = input.intent?.trim();
  if (intent && intent !== "other") {
    return intent;
  }
  return input.title.trim().slice(0, 48) || "experience";
}

export function meaningNodeId(kind: MeaningNodeKind, label: string): string {
  const normalized =
    kind === "person"
      ? normalizeMeaningPerson(label)
      : kind === "place"
        ? normalizeMeaningPlace(label)
        : label.trim();
  return `${kind}:${normalized.toLowerCase()}`;
}

export function meaningEdgeId(
  kind: MeaningEdgeKind,
  fromId: string,
  toId: string,
): string {
  const pair = [fromId, toId].sort();
  return `${kind}:${pair[0]}↔${pair[1]}`;
}
