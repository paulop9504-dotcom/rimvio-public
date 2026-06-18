import type { DataArchitectAction } from "@/lib/data-architect/types";

export type ArchitectActionOption = {
  id: DataArchitectAction;
  label: string;
};

export const ARCHITECT_ACTION_OPTIONS: ArchitectActionOption[] = [
  { id: "APPEND", label: "기존 컨테이너에 추가" },
  { id: "CREATE_NEW", label: "새 컨테이너 생성" },
  { id: "UNCATEGORIZED", label: "임시(Uncategorized) — 사용자 확인" },
];

export function architectActionLabel(action: DataArchitectAction): string {
  return ARCHITECT_ACTION_OPTIONS.find((option) => option.id === action)?.label ?? action;
}

export function normalizeArchitectAction(raw: unknown): DataArchitectAction | null {
  if (raw === "APPEND" || raw === "CREATE_NEW" || raw === "UNCATEGORIZED") {
    return raw;
  }
  if (raw === "APPEND_TO_EXISTING_CONTAINER") return "APPEND";
  if (raw === "CREATE_NEW_CONTAINER") return "CREATE_NEW";
  if (raw === "KNOWLEDGE_BASE") return "UNCATEGORIZED";
  return null;
}

/** @deprecated use ARCHITECT_ACTION_OPTIONS */
export const INGEST_DECISION_OPTIONS = ARCHITECT_ACTION_OPTIONS.map((option) => ({
  id: option.id,
  label: option.label,
}));

/** @deprecated */
export const INGEST_CLASSIFY_TASK = "이 데이터가 어디에 귀속되어야 하는가?";

/** @deprecated use architectActionLabel */
export const ingestDecisionLabel = architectActionLabel;

/** @deprecated use normalizeArchitectAction */
export const normalizeLegacyDecisionId = normalizeArchitectAction;
