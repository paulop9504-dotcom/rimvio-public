import assert from "node:assert/strict";
import { detectStudySituation } from "@/lib/contextual-aux/study/detect-study-situation";
import { orchestrateStudyContext } from "@/lib/contextual-aux/study/orchestrate-study-context";
import { spawnStudyAuxActions } from "@/lib/contextual-aux/study/spawn-study-aux-actions";

assert.equal(detectStudySituation("공부 시작할게"), "start_focus");
assert.equal(detectStudySituation("집중 모드 켤게"), "start_focus");
assert.equal(detectStudySituation("다음 시험 언제지"), "exam_planning");
assert.equal(detectStudySituation("이 개념 모르겠어"), "concept_question");
assert.equal(detectStudySituation("오답 노트 복습"), "wrongnotes");
assert.equal(detectStudySituation("강의 이어 볼게"), "lecture_continue");
assert.equal(detectStudySituation("논문 찾아줘"), "materials");
assert.equal(detectStudySituation("오늘 진도 어디까지"), "progress_check");

const startFocus = orchestrateStudyContext("공부 시작할게");
assert.ok(startFocus);
assert.match(startFocus!.summary, /집중/);
assert.equal(startFocus!.metadata?.semantic_reason, "contextual_study_aux");
assert.equal(startFocus!.metadata?.auto_execute_study_aux, "focus_timer");
assert.ok(startFocus!.actions?.some((a) => a.payload?.study_aux === "focus_timer"));

const exam = orchestrateStudyContext("기말 시험 일정 잡아줘");
assert.ok(exam);
assert.ok(exam!.actions?.some((a) => a.payload?.study_aux === "exam_scheduler"));

const spawned = spawnStudyAuxActions("generic_study");
const labels = spawned.map((a) => a.label).join("|");
assert.doesNotMatch(labels, /스터디 그룹|좌석 예약/);
assert.ok(spawned.length <= 2, "contextual spawn stays minimal");

console.log("test-study-contextual-aux: ok");
