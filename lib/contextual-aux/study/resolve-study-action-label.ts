import type { StudyAuxKind } from "@/lib/contextual-aux/study/types";

const LABEL_TO_KIND: ReadonlyArray<{ pattern: RegExp; kind: StudyAuxKind }> = [
  { pattern: /집중\s*모드|타이머\s*시작|focus\s*timer/iu, kind: "focus_timer" },
  { pattern: /목표\s*진도|진도율/iu, kind: "progress" },
  { pattern: /학습\s*자료|논문\s*열/iu, kind: "materials" },
  { pattern: /오답\s*노트/iu, kind: "wrongnotes" },
  { pattern: /개념.*질문|ai.*질문/iu, kind: "study_qa" },
  { pattern: /강의\s*이어|온라인\s*강의/iu, kind: "lecture_register" },
  { pattern: /시험\s*일정|디데이|d-day/iu, kind: "exam_scheduler" },
];

const PLUGIN_TO_KIND: Record<string, StudyAuxKind> = {
  "study.focus_timer": "focus_timer",
  "study.progress": "progress",
  "study.materials": "materials",
  "study.wrongnotes": "wrongnotes",
  "study.lecture": "lecture_register",
  "study.exam": "exam_scheduler",
  "chat.followup": "study_qa",
};

export function resolveStudyAuxFromLabel(message: string): StudyAuxKind | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  for (const entry of LABEL_TO_KIND) {
    if (entry.pattern.test(trimmed)) {
      return entry.kind;
    }
  }

  return null;
}

export function resolveStudyAuxFromPlugin(plugin: string | undefined): StudyAuxKind | null {
  if (!plugin) {
    return null;
  }
  return PLUGIN_TO_KIND[plugin] ?? null;
}
