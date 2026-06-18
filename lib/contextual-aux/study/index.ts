export type {
  StudyAuxKind,
  StudyAuxSpawnItem,
  StudySituation,
} from "@/lib/contextual-aux/study/types";

export {
  detectStudySituation,
  isStudyUtterance,
} from "@/lib/contextual-aux/study/detect-study-situation";

export {
  spawnStudyAuxActions,
  studySituationSummary,
} from "@/lib/contextual-aux/study/spawn-study-aux-actions";

export { orchestrateStudyContext } from "@/lib/contextual-aux/study/orchestrate-study-context";

export {
  isAwaitingLectureUrl,
  isStudyAuxKind,
  isStudyQaModeActive,
  readSavedLectureUrl,
  readStudyAuxFromPayload,
  saveLectureUrl,
  setAwaitingLectureUrl,
  setStudyQaMode,
} from "@/lib/contextual-aux/study/study-aux-session";
