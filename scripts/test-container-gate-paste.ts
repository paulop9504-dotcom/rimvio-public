import assert from "node:assert/strict";
import { tryContainerActionGate } from "../lib/containers/enforce-container-actions";

const placePaste =
  "대전 서구 대덕대로233번길 17 정부청사역 2번 출구에서 620m 영업시간 오늘 휴무 전화번호 042-489-6274";

const blocked = tryContainerActionGate({
  message: placePaste,
  activeChains: ["bitcoin_trader"],
});
assert.equal(blocked, null, "place paste should not hit container gate");

const callBlocked = tryContainerActionGate({
  message: "전화번호 042-489-6274",
  activeChains: ["bitcoin_trader"],
});
assert.equal(callBlocked, null, "phone label alone should not block");

const realCall = tryContainerActionGate({
  message: "여기 전화해줘",
  activeChains: ["bitcoin_trader"],
});
assert.ok(realCall?.summary?.includes("지원하지 않는"), "explicit call should block in trader");

console.log("test-container-gate-paste: ok");
