import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  isStudyAuxKind,
  readSavedLectureUrl,
  saveLectureUrl,
  setAwaitingLectureUrl,
  setStudyQaMode,
  type StudyAuxKind,
} from "@/lib/contextual-aux/study/study-aux-session";
import {
  formatStudyFocusStartClock,
  saveStudyFocusTimerToCalendar,
} from "@/lib/contextual-aux/study/save-study-focus-timer";

const LECTURE_URL_RE = /^https?:\/\/.+/i;

export type StudyAuxClientDeps = {
  readMessages: () => ActionChatMessage[];
  persist: (messages: ActionChatMessage[]) => void;
  setDatePickerRequest: (request: ActionUiTriggerWire | null) => void;
  sendMessage: (text: string) => Promise<void>;
  toastSuccess: (message: string, description?: string) => void;
};

function appendAssistant(
  deps: StudyAuxClientDeps,
  text: string,
  extra?: Partial<ActionChatMessage>,
) {
  const current = deps.readMessages();
  deps.persist([
    ...current,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text,
      createdAt: new Date().toISOString(),
      actionsRevealed: true,
      pendingConfirm: false,
      ...extra,
    },
  ]);
}

export function tryConsumeLectureUrlRegistration(
  text: string,
  deps: StudyAuxClientDeps,
): boolean {
  const trimmed = text.trim();
  if (!LECTURE_URL_RE.test(trimmed)) {
    return false;
  }

  saveLectureUrl(trimmed);
  const current = deps.readMessages();
  deps.persist([
    ...current,
    {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "강의 URL 저장했어요. 다음부터 **온라인 강의 이어보기**를 누르면 바로 열릴 거예요.",
      createdAt: new Date().toISOString(),
      actionsRevealed: true,
      pendingConfirm: false,
    },
  ]);
  deps.toastSuccess("강의 URL 등록 완료");
  return true;
}

export async function executeStudyAuxClient(
  kind: StudyAuxKind,
  deps: StudyAuxClientDeps,
): Promise<void> {
  switch (kind) {
    case "focus_timer": {
      const payload = await saveStudyFocusTimerToCalendar();
      const clock = formatStudyFocusStartClock(payload.startedAt);
      deps.toastSuccess("공부 타이머 시작", `${clock} · 캘린더에 저장했어요`);
      appendAssistant(
        deps,
        `⏱️ **공부 · ${clock} 시작** — 집중 타이머를 캘린더에 넣었어요. 경과 시간은 캘린더에서 바로 볼 수 있어요.`,
        {
          metadata: {
            intent: "ACTION",
            trust_level_adjustment: "NONE",
            study_focus_session: payload,
          },
        },
      );
      break;
    }
    case "study_qa": {
      setStudyQaMode(true);
      appendAssistant(
        deps,
        "무엇이든 질문하세요. 모르는 개념, 문제 풀이, 헷갈리는 부분 — 편하게 물어보세요.",
      );
      break;
    }
    case "lecture_register": {
      const saved = readSavedLectureUrl();
      if (saved) {
        window.open(saved, "_blank", "noopener,noreferrer");
        deps.toastSuccess("저장된 강의를 열었어요");
        appendAssistant(deps, "▶️ 저장해 두신 강의를 열었어요.");
        break;
      }
      setAwaitingLectureUrl(true);
      appendAssistant(
        deps,
        "자주 사용하실 **강의 URL**을 채팅에 붙여 넣어 주세요. 등록해 두면 다음엔 바로 이어 볼 수 있어요.",
      );
      break;
    }
    case "exam_scheduler": {
      deps.setDatePickerRequest({
        type: "DATE_PICKER",
        draft_task: "시험",
      });
      appendAssistant(
        deps,
        "📅 **시험 일정**을 잡아볼게요. 날짜와 시간을 골라주세요.",
      );
      break;
    }
    case "progress": {
      await deps.sendMessage("오늘 공부 목표 진도 어디까지 했는지 알려줘");
      break;
    }
    case "wrongnotes": {
      await deps.sendMessage("어제 작성한 오답 노트 복습 도와줘");
      break;
    }
    case "materials": {
      await deps.sendMessage("관련 학습 자료나 논문 찾아줘");
      break;
    }
    default:
      break;
  }
}

export function appendStudyQaFollowUpIfNeeded(deps: StudyAuxClientDeps) {
  if (!isStudyQaModeActiveSafe()) {
    return;
  }
  const current = deps.readMessages();
  const last = current[current.length - 1];
  if (!last || last.role !== "assistant" || last.loading) {
    return;
  }
  if (last.text.includes("더 궁금한 거")) {
    return;
  }
  deps.persist([
    ...current,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "더 궁금한 거 있으세요? 이어서 물어보셔도 돼요.",
      createdAt: new Date().toISOString(),
      actionsRevealed: true,
      pendingConfirm: false,
    },
  ]);
}

function isStudyQaModeActiveSafe(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem("rimvio.study-qa-mode.v1") === "1";
}

export function readAutoExecuteStudyAux(
  metadata: Record<string, unknown> | undefined,
): StudyAuxKind | null {
  const raw = metadata?.auto_execute_study_aux;
  return typeof raw === "string" && isStudyAuxKind(raw) ? raw : null;
}

export { isStudyAuxKind, readStudyAuxFromPayload } from "@/lib/contextual-aux/study/study-aux-session";
