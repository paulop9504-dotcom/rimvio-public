#!/usr/bin/env npx tsx
/**
 * Contextual AI prompt builder — link brief + Rimvio lenses before task.
 * Usage: npm run test:ai-prompt
 */

import assert from "node:assert/strict";
import {
  buildContextualSummaryPrompt,
  describeLinkBrief,
  formatEnrichedTitle,
  RIMVIO_BRIEFING_LENSES,
} from "../lib/actions/ai-prompt-context";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

test("naver home gets portal link brief", () => {
  const brief = describeLinkBrief({
    sourceUrl: "https://www.naver.com/",
    domain: "www.naver.com",
    title: "네이버",
  });

  assert.match(brief, /포털|허브|네이버/i);
});

test("enriched title includes Rimvio lenses", () => {
  const title = formatEnrichedTitle("네이버", "www.naver.com");
  for (const lens of RIMVIO_BRIEFING_LENSES) {
    assert.ok(title.includes(lens), `missing lens: ${lens}`);
  }
});

test("summary prompt has context layers before URL", () => {
  const prompt = buildContextualSummaryPrompt({
    sourceUrl: "https://www.naver.com/",
    domain: "www.naver.com",
    title: "네이버",
  });

  const briefIdx = prompt.indexOf("## 1. 링크 설명");
  const lensIdx = prompt.indexOf("## 2. 브리핑 맥락");
  const taskIdx = prompt.indexOf("## 3. 실행 요청");
  const urlIdx = prompt.indexOf("https://www.naver.com/");

  assert.ok(briefIdx >= 0 && lensIdx > briefIdx && taskIdx > lensIdx);
  assert.ok(urlIdx > taskIdx);
  assert.match(prompt, /제목: 네이버 \(.*인지적 과부하 해소/);
  assert.doesNotMatch(prompt, /^다음 링크를 한국어로 3줄/m);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
