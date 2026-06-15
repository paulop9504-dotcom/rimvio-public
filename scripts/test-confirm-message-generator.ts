#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildConfirmMessageBundle,
  generatePersonaConfirmMessage,
} from "../lib/action-chat/confirm-message-generator";

const a = generatePersonaConfirmMessage({
  locationLabel: "둔산동 갤러리아",
  seed: 0,
});
const b = generatePersonaConfirmMessage({
  locationLabel: "둔산동 갤러리아",
  seed: 1,
});

assert.match(a, /둔산동 갤러리아/);
assert.match(a, /말씀이|확인|좋습니다|진행|챙겨/);
assert.ok(a.length <= 72);
assert.notEqual(a, b, "seed should vary template");

const withPending = generatePersonaConfirmMessage({
  locationLabel: "갤러리아",
  hasBatchPending: true,
  seed: 2,
});
assert.match(withPending, /나머지|이어|일정·연락처|확인 후/);

const bundle = buildConfirmMessageBundle({
  locationLabel: "역삼동 스타벅스",
  category: "PLACE",
  seed: 3,
});
assert.ok(bundle.persona_message);
assert.equal(bundle.data_prompt, "아래 정보로 진행할까요?");

console.log("test-confirm-message-generator: ok");
