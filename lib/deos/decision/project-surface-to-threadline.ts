import type { DecisionSurface } from "@/lib/deos/decision/decision-contract-types";
import type {
  DecisionCardModel,
  ForkChip,
  ResolveChipPayload,
} from "@/lib/threadline/threadline-types";

function mapChipRole(
  role: ForkChip["role"]
): ForkChip["role"] {
  return role;
}

/** UX projection — DecisionSurface → Threadline DecisionCard (kernel v1). */
export function projectSurfaceToDecisionCard(
  surface: DecisionSurface,
  options?: { cardId?: string; updatedAt?: string }
): DecisionCardModel {
  const id = options?.cardId ?? `card:compose-${Date.now()}`;
  const updatedAt = options?.updatedAt ?? new Date().toISOString();

  if (surface.mode === "blocked") {
    return {
      id,
      state: "WAITING",
      title: surface.title,
      because: surface.because,
      chips: [
        { id: "defer", label: "나중에", role: "escape" },
      ],
      updatedAt,
    };
  }

  if (surface.mode === "fork") {
    return {
      id,
      state: "WAITING",
      title: surface.title,
      because: surface.because,
      chips: surface.chips.map((chip) => ({
        id: chipResolveIdFromFork(chip.actionId, chip.id),
        label: chip.label,
        role: mapChipRole(chip.role),
      })),
      updatedAt,
    };
  }

  return {
    id,
    state:
      surface.targetState === "DONE"
        ? "DONE"
        : surface.targetState === "DEFERRED"
          ? "DEFERRED"
          : "WAITING",
    title: surface.title,
    because: surface.because,
    settledLine:
      surface.targetState === "DONE"
        ? `${surface.title} · 처리됨`
        : undefined,
    updatedAt,
  };
}

export function chipResolveIdFromFork(actionId: string, chipId: string): string {
  if (actionId.includes("date_default")) {
    return "date_default";
  }
  if (actionId.includes("confirm")) {
    return "confirm_default";
  }
  if (actionId.includes("approve")) {
    return "approve_default";
  }
  if (actionId.includes("picker") || actionId.includes("alt")) {
    return "date_alt";
  }
  if (actionId.includes("defer")) {
    return "defer";
  }
  return chipId.replace(/^chip:/, "");
}

/** Map composed action id → Threadline resolve payload (OCR path). */
export function resolvePayloadFromActionId(
  actionId: string,
  candidates: import("@/lib/deos/decision/decision-contract-types").CandidateAction[]
): ResolveChipPayload | null {
  const action = candidates.find((c) => c.id === actionId);
  if (!action) {
    return null;
  }
  const payload = action.payload;
  switch (action.kind) {
    case "ocr_date":
      return {
        kind: "ocr_date",
        patches:
          (payload.patches as Array<{
            candidateId: string;
            date: string;
          }>) ?? [],
      };
    case "ocr_confirm":
      return {
        kind: "ocr_confirm",
        message: String(payload.message ?? "응"),
      };
    case "ocr_approve":
      return {
        kind: "ocr_approve",
        message: String(payload.message ?? "맞아"),
      };
    case "ocr_open_date_picker":
      return { kind: "open_date_picker" };
    case "defer":
      return { kind: "defer" };
    default:
      return null;
  }
}
