import type { StudyAuxKind } from "@/lib/contextual-aux/study/types";

const QA_MODE_KEY = "rimvio.study-qa-mode.v1";
const LECTURE_AWAIT_KEY = "rimvio.study-lecture-await.v1";
const LECTURE_URL_KEY = "rimvio.study-lecture-url.v1";

export function setStudyQaMode(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  if (active) {
    sessionStorage.setItem(QA_MODE_KEY, "1");
  } else {
    sessionStorage.removeItem(QA_MODE_KEY);
  }
}

export function isStudyQaModeActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(QA_MODE_KEY) === "1";
}

export function setAwaitingLectureUrl(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  if (active) {
    sessionStorage.setItem(LECTURE_AWAIT_KEY, "1");
  } else {
    sessionStorage.removeItem(LECTURE_AWAIT_KEY);
  }
}

export function isAwaitingLectureUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(LECTURE_AWAIT_KEY) === "1";
}

export function saveLectureUrl(url: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(LECTURE_URL_KEY, url.trim());
  sessionStorage.removeItem(LECTURE_AWAIT_KEY);
}

export function readSavedLectureUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = localStorage.getItem(LECTURE_URL_KEY);
  return value?.trim() || null;
}

export function isStudyAuxKind(value: string): value is StudyAuxKind {
  return (
    value === "focus_timer" ||
    value === "study_qa" ||
    value === "lecture_register" ||
    value === "exam_scheduler" ||
    value === "progress" ||
    value === "wrongnotes" ||
    value === "materials"
  );
}

export function readStudyAuxFromPayload(
  payload: Record<string, unknown> | undefined,
): StudyAuxKind | null {
  const raw = payload?.study_aux;
  return typeof raw === "string" && isStudyAuxKind(raw) ? raw : null;
}
