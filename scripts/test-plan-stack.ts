#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import { buildPlanContextDraft } from "../lib/plan-context/build-plan-context-draft";
import {
  buildPlanStackProjection,
  shouldShowPlanStack,
} from "../lib/plan-context/build-plan-stack-projection";
import type { PlanContext } from "../lib/plan-context/plan-context-types";

const now = new Date("2026-06-10T10:00:00+09:00");

const plan: PlanContext = {
  title: "오사카 여행",
  windowStartIso: "2026-06-12T09:00:00+09:00",
  windowEndIso: "2026-06-15T18:00:00+09:00",
  windowConfidence: "confirmed",
  nights: 3,
  place: "오사카",
  peerDisplayName: "민수",
  attachMode: "new",
  planMode: "group",
};

const row: UnifiedCalendarOverlayRow = {
  id: "row:osaka",
  event: {
    id: "chip:osaka",
    layer: "event",
    eventId: "plan-osaka",
    entry: null,
    title: "오사카 여행",
    dateKey: "2026-06-12",
    startMs: Date.parse("2026-06-12T09:00:00+09:00"),
    hour: 9,
    minute: 0,
    tone: "blue",
    hasTime: true,
  },
  overlayActions: [
    {
      id: "nav",
      label: "길찾기",
      source: "projection",
      action_tier: "MAIN",
      deeplink: "rimvio://navigate/kakao?q=오사카",
    },
  ],
  spawn_phase: "travel",
  prompt_hint: "이동해야 할 시간입니다",
};

assert.equal(shouldShowPlanStack(plan), true);
assert.equal(shouldShowPlanStack(null), false);

const stack = buildPlanStackProjection({ plan, row, now });
assert.ok(stack.before.length >= 1, "before legs for travel plan");
assert.match(stack.before[0]!.label, /이동|출발|준비/);
assert.ok(stack.after.length >= 1, "after legs when window end exists");
assert.match(stack.after[0]!.label, /귀가|마무리/);

const draft = buildPlanContextDraft({
  title: "오사카",
  windowStartIso: "2026-06-12T09:00:00+09:00",
  peerDisplayName: "민수",
  conversationText: "3박4일 오사카 가자",
  events: [],
});
assert.equal(draft.context.planMode, "group");

const soloDraft = buildPlanContextDraft({
  title: "헬스",
  windowStartIso: "2026-06-12T09:00:00+09:00",
  conversationText: "내일 헬스",
  events: [],
});
assert.equal(soloDraft.context.planMode, "solo");

console.log("test-plan-stack: ok");
