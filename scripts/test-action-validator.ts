#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { validateLinkAction, validateLinkActions } from "../lib/actions/action-validator";
import { resolveDeepLinkWebFallback } from "../lib/actions/deep-link-fallbacks";
import { createOpenAction } from "../lib/enrichers/action-factory";
import {
  evaluateContainerMaintenance,
} from "../lib/containers/context-containers";

assert.match(
  resolveDeepLinkWebFallback("tmap://search?name=쿠우쿠우%20도안점") ?? "",
  /map\.naver\.com/
);

assert.match(
  resolveDeepLinkWebFallback("nmap://search?query=강남역") ?? "",
  /map\.naver\.com/
);

const tmapAction = createOpenAction({
  label: "네비게이션",
  href: "tmap://search?name=떡반집",
  icon: "navigation",
  copyText: "떡반집",
});

const validated = validateLinkAction(tmapAction);
assert.equal(validated.payload?.validationStatus, "fallback_added");
assert.match(String(validated.payload?.fallbackHref), /map\.naver\.com/);

const httpsAction = createOpenAction({
  label: "홈페이지",
  href: "https://www.qooqoo.co.kr/",
  icon: "globe",
});

assert.equal(validateLinkAction(httpsAction).payload?.validationStatus, "ok");

const batch = validateLinkActions([tmapAction, httpsAction]);
assert.equal(batch.length, 2);

const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
const maintenance = evaluateContainerMaintenance([
  {
    id: "ctx-stale",
    title: "테스트 여행",
    itemCount: 2,
    createdAt: staleDate,
    updatedAt: staleDate,
    lastOpenedAt: staleDate,
    archivedAt: null,
  },
]);
assert.ok(maintenance.archived.some((item) => item.id === "ctx-stale"));
assert.ok(maintenance.next.find((item) => item.id === "ctx-stale")?.archivedAt);

console.log("test-action-validator: ok");
