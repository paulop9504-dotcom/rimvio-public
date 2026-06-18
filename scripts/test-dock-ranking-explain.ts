#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { formatDockRankingWhyLine } from "../lib/action-decision/build-dock-ranking-explain";
import { scoreActionDecision } from "../lib/action-decision/split-main-aux-actions";
import { buildDockRankingWhyFromScored } from "../lib/action-decision/build-dock-ranking-explain";
import { resetLearningRollupForTests } from "../lib/archive/learning-rollup-store";
import { splitMainAuxActionsWithExplain } from "../lib/action-decision/split-main-aux-actions";
import { buildFeedPrimaryRankingWhy } from "../lib/feed/rank-feed-link-actions";

const contextKey = "event.travel.mention:navigate";
resetLearningRollupForTests([
  {
    contextKey,
    actionKey: "nav",
    label: "길찾기",
    shown: 10,
    clicked: 8,
    executed: 7,
    dismissed: 0,
    rates: { clickRate: 0.8, executeRate: 0.7, dismissRate: 0 },
    scoreDelta: 1,
    updatedAt: new Date().toISOString(),
  },
]);

const scored = scoreActionDecision({
  candidate: { id: "nav", label: "길찾기", action_type: "NAVIGATE", plugin: "kakaomap" },
  ranking_context_key: contextKey,
});

assert.ok(scored.rollup_score_delta >= 0.3);
const why = buildDockRankingWhyFromScored(scored);
assert.match(why, /길찾기/);
assert.match(why, /(학습|길찾기)/);

const split = splitMainAuxActionsWithExplain({
  candidates: [
    { id: "taxi", label: "카카오T", action_type: "TAXI" },
    { id: "nav", label: "길찾기", action_type: "NAVIGATE", plugin: "kakaomap" },
  ],
  minutes_until_event: 25,
  ranking_context_key: contextKey,
});
assert.equal(split.primary_action?.action_id, "nav");
assert.ok(split.primary_why_line);

const feedWhy = buildFeedPrimaryRankingWhy({
  actions: [
    {
      id: "map",
      label: "카카오맵",
      kind: "open",
      href: "https://place.map.kakao.com/x",
      payload: { icon: "kakaomap" },
    },
  ],
  primary: {
    id: "map",
    label: "카카오맵",
    kind: "open",
    href: "https://place.map.kakao.com/x",
    payload: { icon: "kakaomap" },
  },
  link: {
    domain: "place.map.kakao.com",
    category: "place",
    original_url: "https://place.map.kakao.com/x",
  },
});
assert.match(feedWhy, /카카오맵/);

const line = formatDockRankingWhyLine({
  primaryLabel: "열기",
  factors: [{ key: "domain", label: "도메인=kakaomap", weight: 1 }],
});
assert.match(line, /도메인=kakaomap/);

console.log("test-dock-ranking-explain: ok");
