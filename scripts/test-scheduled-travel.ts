#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { tryScheduledTravelAction } from "../lib/action-chat/try-scheduled-travel-action";
import {
  buildScheduledPlaceNavActions,
  isFutureScheduledDatetime,
  shouldDeferActionsForSchedule,
} from "../lib/action-chat/scheduled-action-delivery";
import { parseRelativeDateTimeFromText } from "../lib/action-chat/action-agent-normalize";

const iso = parseRelativeDateTimeFromText("3분뒤 수서역 가야됨", "2026-05-29");
assert.ok(iso);
assert.ok(isFutureScheduledDatetime(iso));

const result = tryScheduledTravelAction({
  message: "3분뒤 수서역 가야됨",
  referenceDate: "2026-05-29",
});
assert.ok(result);
assert.equal(result!.scheduledDelivery?.status, "pending");
assert.equal(result!.actions.length, 0);
assert.match(result!.summary, /저장했어요/);
assert.match(result!.summary, /교통·날씨/);
assert.equal(result!.scheduleExtract?.place_name, "수서역");

const navActions = buildScheduledPlaceNavActions(result!.scheduleExtract!);
assert.ok(navActions.length >= 1);
assert.ok(navActions.some((action) => /네비|navigation/i.test(action.label)));
assert.equal(
  navActions.some((action) => /일정\s*추가/i.test(action.label)),
  false
);

const extracted = {
  address: null,
  phone: null,
  datetime: iso,
  place_name: "수서역",
  url: null,
};
assert.equal(shouldDeferActionsForSchedule(extracted), true);

console.log("test-scheduled-travel: ok");
