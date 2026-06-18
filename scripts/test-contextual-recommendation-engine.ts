#!/usr/bin/env npx tsx
import { recommendFromContext } from "../lib/event-os/contextual-recommendation/recommend-from-context";
import { validateRecommendationResult } from "../lib/event-os/contextual-recommendation/validate-recommendation-result";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

const EXAMPLE =
  "어제 햄버거 먹었는데 오늘 저녁 뭐 먹지?";

const result = recommendFromContext({
  message: EXAMPLE,
  clock: new Date("2026-06-01T18:00:00"),
  topN: 3,
});

if (result.context.intent !== "FOOD_RECOMMENDATION") {
  fail(`intent:${result.context.intent}`);
}
if (result.context.lastMeal !== "햄버거") {
  fail(`lastMeal:${result.context.lastMeal}`);
}
if (result.context.timeOfDay !== "dinner") {
  fail(`timeOfDay:${result.context.timeOfDay}`);
}
if (!result.constraints.avoidSameCategory) {
  fail("avoidSameCategory_not_set");
}
if (!result.constraints.reduceHeavyFood) {
  fail("reduceHeavyFood_not_set");
}

const topItems = result.rankedCandidates.map((row) => row.item);
if (topItems.includes("햄버거") || topItems.some((item) => /버거/u.test(item))) {
  fail("burger_should_not_rank_top");
}
if (topItems[0] !== "김치찌개") {
  fail(`expected_kimchi_jjigae_first got:${topItems[0]}`);
}

for (const row of result.rankedCandidates) {
  if (row.score <= 0) {
    fail(`invalid_score:${row.item}`);
  }
}

const kimchiExplain = result.explanationTrace.find(
  (row) => row.item === "김치찌개"
);
if (
  !kimchiExplain?.lines.some(
    (line) =>
      line.rationale.includes("햄버거") ||
      line.rationale.includes("lastMeal")
  )
) {
  fail("kimchi_explanation_missing_lastMeal_causal");
}

const validationFailures = validateRecommendationResult(
  { message: EXAMPLE },
  result
);
if (validationFailures.length > 0) {
  fail(`validation:${validationFailures.join(",")}`);
}

// Counter: no constraints path must throw
try {
  recommendFromContext({ message: "안녕" });
  fail("unknown_intent_should_fail_validation");
} catch {
  // expected
}

const report = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  violations,
  context: result.context,
  constraints: result.constraints,
  rankedCandidates: result.rankedCandidates,
  explanationTrace: result.explanationTrace,
  decisionRationale: result.decisionRationale,
};

console.log(JSON.stringify(report, null, 2));

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-contextual-recommendation-engine: ok");
