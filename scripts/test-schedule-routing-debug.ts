import assert from "node:assert/strict";
import { orchestratePlaceConfirm } from "../lib/action-chat/orchestrate-place-confirm";
import { orchestrateScheduleListBatch } from "../lib/global-brain/orchestrate-schedule-list-batch";
import { orchestrateTimeDecision } from "../lib/time-decision/orchestrate-time-decision";

const MSG = `6월2일 일과
07:00 기상
08:00 출근
10:00 Zoom 회의
12:00 점심 약속
14:00 치과
18:00 헬스장
20:00 친구 생일
23:00 취침`;

async function main() {
  const placeConfirm = await orchestratePlaceConfirm({
    message: MSG,
    referenceDate: "2026-05-31",
  });
  assert.equal(placeConfirm, null, "place confirm must not hijack day plan batch");

  const timeDecision = orchestrateTimeDecision({
    message: MSG,
    referenceDate: "2026-05-31",
    now: new Date("2026-05-31T06:00:00"),
  });
  assert.equal(timeDecision, null, "time decision must not hijack day plan batch");

  const scheduleBatch = orchestrateScheduleListBatch({
    message: MSG,
    referenceDate: "2026-05-31",
  });
  assert.ok(scheduleBatch);
  assert.equal(scheduleBatch!.confirmation?.batch_pending?.length, 8);
  assert.match(scheduleBatch!.summary, /8개/);
  assert.match(scheduleBatch!.summary, /6월 2일/);

  console.log("test-schedule-routing-debug: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
