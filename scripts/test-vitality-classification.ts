#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyVitalityByPurpose } from "../lib/vitality/classify-vitality-purpose";
import { inferVitalityFromText } from "../lib/schedule/infer-schedule-event-meta";

assert.equal(classifyVitalityByPurpose("친구랑 커피"), "Nexus");
assert.equal(classifyVitalityByPurpose("친구랑 카페"), "Nexus");
assert.equal(classifyVitalityByPurpose("혼자 카페"), "Haven");
assert.equal(classifyVitalityByPurpose("둔산동 헤어숍 2시 예약"), "Haven");
assert.equal(classifyVitalityByPurpose("중요한 미팅(Nexus)"), "Nexus");
assert.equal(classifyVitalityByPurpose("나 오늘 4시에 친구랑 약속있어"), "Nexus");
assert.equal(classifyVitalityByPurpose("프로젝트 발표 준비"), "Apex");
assert.equal(classifyVitalityByPurpose("자격증 공부 2시간"), "Apex");
assert.equal(classifyVitalityByPurpose("치과예약 몇 시야?"), "Sentinel");
assert.equal(classifyVitalityByPurpose("세금 신고 마감"), "Sentinel");
assert.equal(classifyVitalityByPurpose("대전 수육 맛집좀 찾아줘"), "Haven");

assert.equal(inferVitalityFromText("친구랑 커피"), "Nexus");

console.log("test-vitality-classification: ok");
