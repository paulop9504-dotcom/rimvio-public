import type { StudySituation } from "@/lib/contextual-aux/study/types";

const STUDY_CORE =
  /(?:공부|학습|스터디|시험|exam|강의|lecture|논문|오답|집중|복습|암기|과제|숙제|study)/iu;

const START_FOCUS =
  /(?:공부\s*(?:시작|할게|한다|할\s*거|할거|해야)|집중\s*(?:모드|할게|시작)|스터디\s*(?:시작|할게)|(?:시작|할게)\s*공부|(?:지금부터|이제)\s*.*공부)/iu;

const EXAM =
  /(?:시험|exam|디데이|d-day|수능|midterm|final|기말|중간고사)/iu;

const CONCEPT =
  /(?:모르(?:는|겠)|개념|설명\s*해|이해\s*(?:안|못)|왜\s*(?:이|그)|질문\s*있)/iu;

const WRONGNOTES =
  /(?:오답|틀린\s*(?:문제|것)|wrong\s*note|복습\s*노트)/iu;

const LECTURE =
  /(?:강의\s*(?:이어|계속|보|들)|온라인\s*강의|인강|udemy|coursera|inflearn)/iu;

const MATERIALS =
  /(?:논문|자료|pdf|reference|레퍼런스|참고\s*문헌|paper)/iu;

const PROGRESS =
  /(?:진도|목표|진행\s*률|얼마나\s*했|progress)/iu;

export function isStudyUtterance(message: string): boolean {
  return STUDY_CORE.test(message.trim());
}

export function detectStudySituation(message: string): StudySituation | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (START_FOCUS.test(trimmed)) {
    return "start_focus";
  }
  if (EXAM.test(trimmed)) {
    return "exam_planning";
  }
  if (WRONGNOTES.test(trimmed)) {
    return "wrongnotes";
  }
  if (
    CONCEPT.test(trimmed) &&
    (STUDY_CORE.test(trimmed) || EXAM.test(trimmed) || LECTURE.test(trimmed))
  ) {
    return "concept_question";
  }
  if (LECTURE.test(trimmed)) {
    return "lecture_continue";
  }
  if (MATERIALS.test(trimmed)) {
    return "materials";
  }
  if (PROGRESS.test(trimmed)) {
    return "progress_check";
  }

  if (STUDY_CORE.test(trimmed)) {
    return "generic_study";
  }

  return null;
}
