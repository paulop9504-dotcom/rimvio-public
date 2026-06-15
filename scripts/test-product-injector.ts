#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildProductDecisionContext,
  detectEmotionalState,
  hasModelName,
  injectProducts,
  isBlockedProductUrl,
  isProductPageUrl,
  parseNaverShoppingWebProducts,
  parseProductShoppingIntent,
  rankProductCandidates,
  routeEmotionalProductsPublic,
  scorePurchaseDirectness,
  selectProductDecision,
  selectProductDecisionJson,
} from "../lib/product-injector";

async function main() {
  assert.equal(isBlockedProductUrl("https://www.coupang.com/np/search?q=earphone"), true);
  assert.equal(isBlockedProductUrl("https://blog.naver.com/test/123"), true);
  assert.equal(isBlockedProductUrl("https://www.coupang.com/"), true);

  assert.equal(
    isProductPageUrl("https://www.coupang.com/vp/products/1234567890"),
    true,
  );
  assert.equal(
    isProductPageUrl("https://smartstore.naver.com/store/products/9876543210"),
    true,
  );
  assert.equal(isProductPageUrl("https://search.shopping.naver.com/search/all?query=ipad"), false);

  assert.ok(scorePurchaseDirectness("https://www.coupang.com/vp/products/123") > 0.7);

  assert.equal(hasModelName("Apple AirPods Pro 2"), true);
  assert.equal(hasModelName("naver shopping result"), false);
  assert.equal(hasModelName("ab"), false);

  const htmlFixture = `
{"productName":"삼성 갤럭시 버uds3 Pro","productUrl":"https:\\/\\/cr.shopping.naver.com\\/adcr?x=abc","lowPrice":"219000"}
{"productName":"Apple 에어팟 프로 2세대","productUrl":"https:\\/\\/smartstore.naver.com\\/shop\\/products\\/12345","lowPrice":"329000"}
{"productName":"소니 WH-1000XM5","productUrl":"https:\\/\\/www.coupang.com\\/vp\\/products\\/999","lowPrice":"389000"}
`;

  const parsed = parseNaverShoppingWebProducts(htmlFixture);
  assert.ok(parsed.length >= 2);
  assert.ok(parsed.every((p) => p.source_url.startsWith("http")));

  const ranked = rankProductCandidates({
    query: "에어팟",
    raw: parsed,
    context: { urgency: "HIGH", budget: 350_000 },
  });
  assert.ok(ranked.length >= 1);
  assert.ok(ranked.length <= 3);
  assert.ok(ranked.every((p) => p.source_url && p.name && p.confidence > 0));

  const intent = parseProductShoppingIntent("무선 이어폰 사고싶어");
  assert.ok(intent);
  assert.equal(intent!.user_intent, "purchase");
  assert.match(intent!.query, /이어폰/);

  const recommend = parseProductShoppingIntent("아이패드 프로 추천해줘");
  assert.ok(recommend);
  assert.equal(recommend!.user_intent, "recommend");

  assert.equal(parseProductShoppingIntent("쿠팡 열어"), null);

  const deduped = rankProductCandidates({
    query: "에어팟",
    raw: [
      {
        name: "Apple AirPods Pro 2 USB-C",
        price: 329_000,
        source_url: "https://smartstore.naver.com/a/products/1",
        source: "naver_shop",
      },
      {
        name: "Apple AirPods Pro 2nd USB-C",
        price: 325_000,
        source_url: "https://smartstore.naver.com/a/products/2",
        source: "naver_shop",
      },
      {
        name: "Sony WH-1000XM5 헤드폰",
        price: 389_000,
        source_url: "https://www.coupang.com/vp/products/999",
        source: "naver_shop",
      },
    ],
  });
  assert.ok(deduped.length <= 3);
  assert.ok(deduped.length >= 2);

  const candidates = [
    {
      name: "Apple AirPods Pro 2 USB-C",
      price: "329,000원",
      reason: "바로 구매 가능한 상품 페이지",
      source_url: "https://www.coupang.com/vp/products/111",
      confidence: 0.88,
    },
    {
      name: "Sony WH-1000XM5",
      price: "389,000원",
      reason: "실시간 쇼핑 검색 결과",
      source_url: "https://smartstore.naver.com/a/products/222",
      confidence: 0.75,
    },
    {
      name: "삼성 갤럭시 버uds3 Pro",
      price: "219,000원",
      reason: "검색어와 높은 일치 · 구매 가능",
      source_url: "https://cr.shopping.naver.com/adcr?x=abc",
      confidence: 0.8,
    },
  ];

  const urgentDecision = selectProductDecision({
    intent: "purchase",
    query: "에어팟",
    context: { urgency: "HIGH" },
    candidate_products: candidates,
  });
  assert.ok(urgentDecision);
  assert.equal(urgentDecision!.selected_product.fallback_hidden, true);
  assert.match(urgentDecision!.selected_product.name, /AirPods/i);

  const tiredDecision = selectProductDecision({
    intent: "recommend",
    query: "이어폰",
    context: { emotion: "tired" },
    candidate_products: candidates,
  });
  assert.ok(tiredDecision);
  assert.match(tiredDecision!.selected_product.reason, /결정/);

  const compareDecision = selectProductDecision({
    intent: "price_compare",
    query: "에어팟",
    context: { compare_mode: true, budget: 350_000 },
    candidate_products: candidates,
  });
  assert.ok(compareDecision);
  assert.equal(compareDecision!.selected_product.fallback_hidden, true);

  const decisionJson = selectProductDecisionJson({
    intent: "purchase",
    query: "에어팟",
    context: buildProductDecisionContext("지금 당장 에어팟 사고싶어 피곤해", "purchase"),
    candidate_products: candidates,
  });
  assert.ok(decisionJson);
  const parsedDecision = JSON.parse(decisionJson!) as {
    selected_product: Record<string, unknown>;
  };
  assert.equal(parsedDecision.selected_product.fallback_hidden, true);
  assert.ok(typeof parsedDecision.selected_product.confidence === "number");
  assert.equal(Object.keys(parsedDecision.selected_product).length, 4);

  const fatigueRoute = routeEmotionalProductsPublic({
    user_intent: "purchase",
    emotional_state: "fatigue",
    candidate_products: candidates,
  });
  assert.equal(fatigueRoute.emotion, "fatigue");
  assert.equal(fatigueRoute.strategy, "minimize_choice_immediate");
  assert.ok(fatigueRoute.recommended_products.length >= 1);
  assert.ok(fatigueRoute.recommended_products.length <= 2);
  assert.equal(fatigueRoute.recommended_products[0]?.action, "BUY");

  const stressRoute = routeEmotionalProductsPublic({
    user_intent: "recommend",
    emotional_state: "stress",
    candidate_products: candidates,
  });
  assert.equal(stressRoute.recommended_products.length, 1);
  assert.equal(stressRoute.recommended_products[0]?.action, "BUY");

  const urgencyRoute = routeEmotionalProductsPublic({
    user_intent: "purchase",
    emotional_state: "urgency",
    candidate_products: candidates,
  });
  assert.equal(urgencyRoute.recommended_products.length, 1);
  assert.match(urgencyRoute.recommended_products[0]?.reason ?? "", /바로/);

  const boredomRoute = routeEmotionalProductsPublic({
    user_intent: "recommend",
    emotional_state: "boredom",
    candidate_products: candidates,
  });
  assert.ok(boredomRoute.recommended_products.length <= 3);
  assert.equal(boredomRoute.strategy, "explore_allowed");

  const neutralRoute = routeEmotionalProductsPublic({
    user_intent: "recommend",
    emotional_state: "neutral",
    candidate_products: candidates,
  });
  assert.ok(neutralRoute.recommended_products.length >= 2);
  assert.ok(neutralRoute.recommended_products.length <= 3);

  assert.equal(detectEmotionalState("지금 당장 에어팟 사고싶어"), "urgency");
  assert.equal(detectEmotionalState("피곤해서 이어폰 사고싶어"), "fatigue");
  assert.equal(detectEmotionalState("심심한데 뭐 살까"), "boredom");

  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    const live = await injectProducts({
      user_intent: "purchase",
      query: "무선 이어폰",
      context: { urgency: "HIGH" },
    });
    assert.ok(Array.isArray(live.products));
    if (live.products.length > 0) {
      assert.ok(live.products.every((p) => isProductPageUrl(p.source_url)));
      console.log(`live product inject: ${live.products.length} candidates`);
    }
  } else {
    console.log("live product inject: skipped (NAVER credentials not set)");
  }

  console.log("test-product-injector: ok");
}

void main();
