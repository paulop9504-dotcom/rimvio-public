#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  getCatalogSize,
  orchestrateKoreanServiceRouter,
  resolveKoreanServiceDeeplink,
  resolveKoreanServiceDeeplinkJson,
  shouldDeferToPlaceDiscovery,
} from "../lib/korean-service-router";
import { tryDeepLinkDispatchOrchestration } from "../lib/deep-link-dispatch/orchestrate-deep-link-dispatch";

assert.equal(getCatalogSize(), 155, "catalog must contain 155 services");

// Immediate order convergence (hunger → delivery, not browse)
const hungry = resolveKoreanServiceDeeplink("배고파");
assert.ok(hungry);
assert.equal(hungry!.action_type, "ORDER");
assert.equal(hungry!.serviceId, "baemin");
assert.match(hungry!.deeplink, /baemin\.com/);

// Named service beats category default
const yogiyo = resolveKoreanServiceDeeplink("요기요에서 치킨 시켜");
assert.ok(yogiyo);
assert.equal(yogiyo!.serviceId, "yogiyo");
assert.equal(yogiyo!.action_type, "ORDER");

// Finance execute
const toss = resolveKoreanServiceDeeplink("토스로 송금");
assert.ok(toss);
assert.equal(toss!.serviceId, "toss");
assert.equal(toss!.action_type, "ORDER");

// App deep link wins over web toss when amount present
const appToss = tryDeepLinkDispatchOrchestration({ message: "토스로 5만원 송금해줘" });
assert.ok(appToss);
assert.match(appToss!.actions[0]?.href ?? "", /supertoss:\/\//);

// Place discovery deferral
assert.ok(shouldDeferToPlaceDiscovery("둔산동 맛집 추천"));
assert.equal(resolveKoreanServiceDeeplink("둔산동 맛집"), null);

// Calendar book
const cal = resolveKoreanServiceDeeplink("내일 미팅 일정 잡아");
assert.ok(cal);
assert.equal(cal!.action_type, "BOOK");
assert.match(cal!.deeplink, /calendar\.google\.com.*eventedit/);

// Search with query tail
const search = resolveKoreanServiceDeeplink("네이버에서 BTS 검색");
assert.ok(search);
assert.equal(search!.serviceId, "naver");
assert.match(search!.deeplink, /search\.naver\.com.*BTS/i);

// JSON output shape (spec fields only)
const json = resolveKoreanServiceDeeplinkJson("쿠팡에서 이어폰 사고싶어");
assert.ok(json);
const parsed = JSON.parse(json!) as Record<string, unknown>;
assert.ok(parsed.intent);
assert.ok(parsed.context);
assert.ok(["ORDER", "SEARCH", "BOOK", "COMPARE", "LEARN"].includes(String(parsed.action_type)));
assert.ok(parsed.deeplink);
assert.ok(typeof parsed.confidence === "number");
assert.ok(parsed.fallback);
assert.equal(Object.keys(parsed).length, 7);

// Orchestrator wiring
const orchestrated = orchestrateKoreanServiceRouter({ message: "배민 주문" });
assert.ok(orchestrated);
assert.equal(orchestrated!.actions.length, 1);
assert.match(orchestrated!.actions[0]?.href ?? "", /baemin\.com/);
assert.equal(orchestrated!.actions[0]?.payload?.koreanServiceRouter, true);

// Career search
const wanted = resolveKoreanServiceDeeplink("원티드에서 프론트엔드 채용");
assert.ok(wanted);
assert.equal(wanted!.serviceId, "wanted");
assert.match(wanted!.deeplink, /wanted\.co\.kr/);

console.log("test-korean-service-router: ok");
