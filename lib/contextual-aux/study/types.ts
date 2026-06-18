export type StudySituation =
  | "start_focus"
  | "exam_planning"
  | "concept_question"
  | "wrongnotes"
  | "lecture_continue"
  | "materials"
  | "progress_check"
  | "generic_study";

export type StudyAuxKind =
  | "focus_timer"
  | "study_qa"
  | "lecture_register"
  | "exam_scheduler"
  | "progress"
  | "wrongnotes"
  | "materials";

export const STUDY_AUX_DISABLED: readonly StudyAuxKind[] = [] as const;

/** Not surfaced as contextual aux candidates (dashboard-only for now). */
export const STUDY_AUX_SUPPRESSED = new Set<string>(["study.group", "study.seat"]);

export type StudyAuxSpawnItem = {
  kind: StudyAuxKind;
  label: string;
  icon: string;
  tier: "MAIN" | "AUX";
  plugin: string;
};
