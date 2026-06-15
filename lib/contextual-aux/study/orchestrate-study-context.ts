import { detectStudySituation, isStudyUtterance } from "@/lib/contextual-aux/study/detect-study-situation";
import { resolveStudyAuxFromLabel } from "@/lib/contextual-aux/study/resolve-study-action-label";
import {
  spawnStudyAuxActions,
  studySituationSummary,
} from "@/lib/contextual-aux/study/spawn-study-aux-actions";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/**
 * Contextual study aux — situation-matched kernels only (not a full dashboard).
 */
export function orchestrateStudyContext(message: string): OrchestratorResult | null {
  const labelKind = resolveStudyAuxFromLabel(message);
  if (labelKind) {
    const situation =
      labelKind === "focus_timer"
        ? "start_focus"
        : labelKind === "exam_scheduler"
          ? "exam_planning"
          : labelKind === "study_qa"
            ? "concept_question"
            : labelKind === "lecture_register"
              ? "lecture_continue"
              : labelKind === "materials"
                ? "materials"
                : labelKind === "progress"
                  ? "progress_check"
                  : labelKind === "wrongnotes"
                    ? "wrongnotes"
                    : "generic_study";
    const actions = spawnStudyAuxActions(situation).filter(
      (action) => action.payload?.study_aux === labelKind,
    );
    const fallbackActions = actions.length > 0 ? actions : spawnStudyAuxActions(situation);

    return {
      summary:
        labelKind === "focus_timer"
          ? "집중 타이머 바로 켤게요."
          : studySituationSummary(situation),
      actions: fallbackActions,
      source: "rules",
      confidence: 0.9,
      disclosure: "high",
      actionsRevealed: true,
      pendingConfirm: false,
      metadata: {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
        semantic_reason: "contextual_study_aux",
        study_situation: situation,
        auto_execute_study_aux: labelKind,
      },
    };
  }

  const situation = detectStudySituation(message);
  if (!situation) {
    if (!isStudyUtterance(message)) {
      return null;
    }
    return null;
  }

  const actions = spawnStudyAuxActions(situation);
  if (actions.length === 0) {
    return null;
  }

  const autoExecute =
    situation === "start_focus" ? ("focus_timer" as const) : undefined;

  return {
    summary: studySituationSummary(situation),
    actions,
    source: "rules",
    confidence: 0.88,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      semantic_reason: "contextual_study_aux",
      study_situation: situation,
      presentation_hint: "contextual_aux_only",
      ...(autoExecute ? { auto_execute_study_aux: autoExecute } : {}),
    },
  };
}
