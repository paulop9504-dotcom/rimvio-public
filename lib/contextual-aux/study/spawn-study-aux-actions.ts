import type {
  StudyAuxKind,
  StudyAuxSpawnItem,
  StudySituation,
} from "@/lib/contextual-aux/study/types";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";

const CATALOG: Record<
  StudyAuxKind,
  Omit<StudyAuxSpawnItem, "kind" | "tier"> & { defaultTier: "MAIN" | "AUX" }
> = {
  focus_timer: {
    label: "집중 모드 및 타이머 시작",
    icon: "⏱️",
    plugin: "study.focus_timer",
    defaultTier: "MAIN",
  },
  study_qa: {
    label: "AI에게 개념 질문",
    icon: "💬",
    plugin: "chat.followup",
    defaultTier: "MAIN",
  },
  lecture_register: {
    label: "온라인 강의 이어보기",
    icon: "▶️",
    plugin: "study.lecture",
    defaultTier: "MAIN",
  },
  exam_scheduler: {
    label: "시험 일정 · D-day",
    icon: "📅",
    plugin: "study.exam",
    defaultTier: "MAIN",
  },
  progress: {
    label: "오늘 목표 진도 확인",
    icon: "📈",
    plugin: "study.progress",
    defaultTier: "AUX",
  },
  wrongnotes: {
    label: "어제 오답 노트 복습",
    icon: "📝",
    plugin: "study.wrongnotes",
    defaultTier: "MAIN",
  },
  materials: {
    label: "학습 자료 · 논문 열기",
    icon: "📄",
    plugin: "study.materials",
    defaultTier: "AUX",
  },
};

const SITUATION_SPAWN: Record<StudySituation, StudyAuxKind[]> = {
  start_focus: ["focus_timer", "progress"],
  exam_planning: ["exam_scheduler"],
  concept_question: ["study_qa"],
  wrongnotes: ["wrongnotes", "study_qa"],
  lecture_continue: ["lecture_register"],
  materials: ["materials", "study_qa"],
  progress_check: ["progress"],
  generic_study: ["focus_timer", "study_qa"],
};

function toLinkAction(item: StudyAuxSpawnItem): LinkActionItem {
  return createOpenAction({
    label: item.label,
    href: `rimvio://study/aux/${item.kind}`,
    icon: item.icon,
    payload: {
      study_aux: item.kind,
      action_tier: item.tier,
      plugin: item.plugin,
      contextual_aux: true,
    },
  });
}

export function spawnStudyAuxActions(situation: StudySituation): LinkActionItem[] {
  const kinds = SITUATION_SPAWN[situation] ?? SITUATION_SPAWN.generic_study;
  const items: StudyAuxSpawnItem[] = kinds.map((kind, index) => {
    const entry = CATALOG[kind];
    return {
      kind,
      label: entry.label,
      icon: entry.icon,
      plugin: entry.plugin,
      tier: index === 0 ? "MAIN" : entry.defaultTier,
    };
  });

  return items.map(toLinkAction);
}

export function studySituationSummary(situation: StudySituation): string {
  switch (situation) {
    case "start_focus":
      return "공부 시작이시네요. **집중 타이머**부터 켤게요.";
    case "exam_planning":
      return "시험 일정이시네요. **D-day**부터 잡아볼게요.";
    case "concept_question":
      return "개념이 헷갈리시는군요. **바로 질문** 이어가요.";
    case "wrongnotes":
      return "오답 복습 타이밍이에요.";
    case "lecture_continue":
      return "강의 이어 보시는군요.";
    case "materials":
      return "자료·논문 쪽으로 볼게요.";
    case "progress_check":
      return "오늘 **진도**부터 확인해요.";
    default:
      return "공부 흐름에 맞춰 **필요한 것만** 골라뒀어요.";
  }
}
