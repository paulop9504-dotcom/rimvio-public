#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestrateScheduleAdvisory } from "../lib/schedule/orchestrate-schedule-advisory";
import {
  isScheduleAdvisoryQuery,
  resolveAdvisoryEventPair,
} from "../lib/schedule/parse-schedule-advisory";
import { scoreScheduleTradeoff } from "../lib/schedule/score-schedule-tradeoff";
import { blocksOverlap } from "../lib/schedule/schedule-time-utils";

const message =
  "둔산동 헤어숍이 2시 예약인데, 2시 반에 중요한 미팅(Nexus) 일정이 잡혀있더라고. 미용실을 미뤄야 돼, 아니면 미팅을 조정해야 돼? 네가 보기에 뭐가 더 효율적이야?";

assert.ok(isScheduleAdvisoryQuery(message));

const pair = resolveAdvisoryEventPair({ message });
assert.ok(pair);
assert.equal(pair!.length, 2);

const [hair, meeting] = pair!;
assert.match(hair.title, /헤어|둔산동/u);
assert.equal(hair.vitality, "Haven");
assert.equal(hair.startMinutes, 14 * 60);

assert.match(meeting.title, /미팅/u);
assert.equal(meeting.vitality, "Nexus");
assert.equal(meeting.priority, "high");
assert.equal(meeting.startMinutes, 14 * 60 + 30);

const overlap = blocksOverlap(
  hair.startMinutes,
  hair.durationMinutes,
  meeting.startMinutes,
  meeting.durationMinutes
);
assert.ok(overlap > 0, "hair block should overlap meeting start");

const tradeoff = scoreScheduleTradeoff(hair, meeting);
assert.equal(tradeoff.moveEventId, hair.id);
assert.equal(tradeoff.keepEventId, meeting.id);

const result = orchestrateScheduleAdvisory({ message });
assert.ok(result);
assert.ok(result?.scheduleAdvisory);
assert.match(result?.summary ?? "", /미팅|미용|헤어/u);
assert.equal(result?.presentation?.mode, "TIMELINE");
assert.ok((result?.actions.length ?? 0) >= 2);
assert.equal(result?.schedule?.is_conflict, true);

console.log("test-schedule-advisory: ok");
