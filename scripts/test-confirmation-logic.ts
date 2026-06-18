import assert from "node:assert/strict";
import { assessPlaceConfirmationNeed, tryPlaceConfirmation } from "@/lib/action-chat/confirmation-logic";
import { buildActionsFromConfirmationData } from "@/lib/action-chat/build-confirmation-actions";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import { resetCorrectionLogForTests } from "@/lib/corrections/correction-log";

resetCorrectionLogForTests();

const ambiguous = assessPlaceConfirmationNeed({
  message: "둔산동 갤러리아 내일 5시",
  referenceDate: "2026-05-29",
});

assert.ok(ambiguous?.needsConfirm, "ambiguous place should need confirmation");
assert.match(ambiguous!.persona_message, /갤러리아|둔산/);
assert.match(ambiguous!.persona_message, /군요|말씀이|좋습니다|진행|확인/);
assert.ok(ambiguous!.persona_message.length <= 72);
assert.match(ambiguous!.extracted_data.place_name ?? "", /갤러리아|둔산/);

const explicit = assessPlaceConfirmationNeed({
  message: "대전 서구 둔산로 123 4층",
  referenceDate: "2026-05-29",
});
assert.equal(explicit, null, "explicit address should skip confirmation");

const ruleResult = tryPlaceConfirmation({
  message: "둔산동 갤러리아",
  referenceDate: "2026-05-29",
});
assert.ok(ruleResult);
assert.equal(ruleResult!.confirmation?.meta.intent, "CONFIRM");
assert.equal(ruleResult!.actions.length, 0);
assert.equal(ruleResult!.pendingConfirm, true);

const normalized = normalizeMasterOrchestratorWire({
  source: "rules",
  wire: {
    summary: ruleResult!.summary,
    actions: [],
    confidence_score: ruleResult!.confidence,
    confirmation: ruleResult!.confirmation,
  },
});
assert.equal(normalized.pendingConfirm, true);
assert.equal(normalized.confirmation?.meta.intent, "CONFIRM");
assert.equal(normalized.actions.length, 0);

const actions = buildActionsFromConfirmationData({
  address: "대전 서구 둔산동 1016",
  phone: null,
  datetime: "2026-05-30T17:00:00",
  place_name: "갤러리아",
  url: null,
});
assert.ok(actions.length >= 1, "confirmed data should produce navigation actions");

const flightCheck = assessPlaceConfirmationNeed({
  message: "항공권 확인해줘",
  referenceDate: "2026-05-29",
});
assert.equal(flightCheck, null, "task command should not trigger place confirm");

const checklist = assessPlaceConfirmationNeed({
  message: "짐 체크리스트 만들어줘",
  referenceDate: "2026-05-29",
});
assert.equal(checklist, null, "checklist command should not trigger place confirm");

const stationStill = assessPlaceConfirmationNeed({
  message: "수서역 길찾기",
  referenceDate: "2026-05-29",
});
assert.ok(stationStill?.needsConfirm, "real place navigation should still confirm");

console.log("test-confirmation-logic: ok");
