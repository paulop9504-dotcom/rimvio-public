import type { ScheduleConfirmDraft } from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";
import {
  resolveTrustStaircaseStage,
  type TrustStaircaseStage,
} from "@/lib/preferences/action-trust";

export type ScheduleTrustZone = "confirm_sheet" | "fast_commit";

export type ScheduleTrustZoneInput = {
  draft: ScheduleConfirmDraft;
  trustStage?: TrustStaircaseStage;
  /** schedule lens bubble successful commits */
  scheduleLensClicks?: number;
};

/**
 * Trusted band — skip confirm sheet, commit immediately, offer undo toast.
 * Conservative: plans, conflicts, continue-attach always use the sheet.
 */
export function resolveScheduleTrustZone(input: ScheduleTrustZoneInput): ScheduleTrustZone {
  const { draft } = input;

  if (draft.conflict.kind !== "none") {
    return "confirm_sheet";
  }
  if (draft.planAttach.canContinue) {
    return "confirm_sheet";
  }
  if (draft.intent.kind === "plan") {
    return "confirm_sheet";
  }
  if (!draft.datetimeIso?.trim()) {
    return "confirm_sheet";
  }
  if (draft.intent.suggestFeed && draft.feedOptInDefault) {
    return "confirm_sheet";
  }
  if (draft.planContext.windowEndIso) {
    return "confirm_sheet";
  }

  const stage = input.trustStage ?? resolveTrustStaircaseStage();
  const scheduleClicks = input.scheduleLensClicks ?? 0;

  if (stage >= 3 && draft.intent.kind === "appointment") {
    return "fast_commit";
  }

  if (
    stage >= 2 &&
    scheduleClicks >= 3 &&
    draft.intent.kind === "appointment"
  ) {
    return "fast_commit";
  }

  return "confirm_sheet";
}
