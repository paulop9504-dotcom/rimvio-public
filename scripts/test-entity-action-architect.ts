#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildEntityArchitectFromText,
  extractPlaceEntities,
  isMessyPlaceDump,
  tryEntityArchitect,
} from "../lib/action-chat/entity-action-architect";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";

const QOOQOO_DUMP = `
쿠우쿠우 도안점
펼쳐보기
대전 서구 도안동로 10 4층
042-544-1162
영업 중 · 11:00 - 22:00
http://www.qooqoo.co.kr/
키워드 선택
참여 인원 128명
사용 안내
리뷰 842
사진 312
공유
`.trim();

assert.ok(isMessyPlaceDump(QOOQOO_DUMP));

const info = extractPlaceEntities(QOOQOO_DUMP);
assert.equal(info.name, "쿠우쿠우");
assert.equal(info.branch, "도안점");
assert.match(info.address?.display ?? "", /도안동로\s*10\s*4층/);
assert.equal(info.address?.nav, "대전 서구 도안동로 10");
assert.equal(info.phone, "042-544-1162");
assert.equal(info.website, "http://www.qooqoo.co.kr/");
assert.equal(info.is_open, true);

const architect = buildEntityArchitectFromText(QOOQOO_DUMP);
assert.ok(architect);
assert.equal(architect!.wire.summary, "쿠우쿠우 도안점 정보");
assert.equal(architect!.actions.length, 4);

const phoneAction = architect!.actions.find((action) => /연락하기/.test(action.label));
assert.ok(phoneAction);
assert.match(phoneAction!.href ?? "", /^tel:/);
assert.equal(phoneAction!.payload?.dialPrep, true);
assert.match(phoneAction!.label, /042-544-1162/);

const navAction = architect!.actions.find((action) => action.label === "네비게이션");
assert.ok(navAction);
assert.ok(navAction!.payload?.navSector === true);
assert.ok(navAction!.payload?.entityNavigate === true);
assert.doesNotMatch(decodeURIComponent(navAction!.href ?? "").replace(/\+/g, " "), /4층/);
assert.match(decodeURIComponent(navAction!.href ?? "").replace(/\+/g, " "), /도안동로 10/);

const webAction = architect!.actions.find((action) => action.label === "홈페이지");
assert.ok(webAction);
assert.match(webAction!.href ?? "", /qooqoo\.co\.kr/);

const orchestrated = orchestrateByRules({ message: QOOQOO_DUMP });
assert.ok(orchestrated.batchResults && orchestrated.batchResults.length >= 2);
assert.ok(orchestrated.batchResults.some((item) => item.type === "PHONE"));
assert.ok(orchestrated.batchResults.some((item) => item.type === "ADDRESS"));

const cleanShort = tryEntityArchitect("강남역 스타벅스");
assert.equal(cleanShort, null, "short clean query should not trigger entity architect");

console.log("test-entity-action-architect: ok");
