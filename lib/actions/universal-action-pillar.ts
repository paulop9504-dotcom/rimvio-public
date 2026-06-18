/** Rimvio Universal Action Buttons — always 4 pillars regardless of domain. */

export type UniversalPillar = "go" | "save" | "deep_dive" | "connect";

export const UNIVERSAL_PILLAR_ORDER: UniversalPillar[] = [
  "go",
  "save",
  "deep_dive",
  "connect",
];

export const UNIVERSAL_PILLAR_LABEL: Record<UniversalPillar, string> = {
  go: "가기",
  save: "저장",
  deep_dive: "더보기",
  connect: "연락/공유",
};

export const UNIVERSAL_PILLAR_ICON: Record<UniversalPillar, string> = {
  go: "map-pin",
  save: "bookmark",
  deep_dive: "file-text",
  connect: "share",
};

export function isUniversalPillar(value: unknown): value is UniversalPillar {
  return value === "go" || value === "save" || value === "deep_dive" || value === "connect";
}

export function readUniversalPillar(action: {
  payload?: Record<string, unknown> | null;
  label?: string;
}): UniversalPillar | null {
  const raw = action.payload?.universalPillar;
  if (isUniversalPillar(raw)) {
    return raw;
  }
  return null;
}

export function isUniversalPrimaryAction(action: { payload?: Record<string, unknown> | null }) {
  return Boolean(action.payload?.universalPrimary ?? action.payload?.domainPrimary);
}
