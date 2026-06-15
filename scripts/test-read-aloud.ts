#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  createReadAloudAction,
  isLegacyTranslateAudioAction,
  isReadAloudAction,
  normalizeReadAloudAction,
} from "../lib/actions/read-aloud-action";
import { trimSpeakText } from "../lib/media/article-text";
import { shouldAutoTranslatePage } from "../lib/links/auto-translate-open";

const legacy = {
  id: "audio-1",
  kind: "open" as const,
  label: "🔊 오디오로 듣기",
  href: "https://translate.google.com/translate?sl=auto&tl=ko&u=https%3A%2F%2Fwww.yna.co.kr%2Fview%2F1",
};

assert.ok(isLegacyTranslateAudioAction(legacy));

const normalized = normalizeReadAloudAction(legacy, {
  original_url: "https://www.yna.co.kr/view/1",
  title: "연합뉴스 기사",
});

assert.ok(isReadAloudAction(normalized));
assert.equal(normalized.href, "#read-aloud");
assert.ok(!String(normalized.href).includes("translate.google"));

const fresh = createReadAloudAction({
  sourceUrl: "https://example.com/article",
  title: "Example",
});
assert.equal(fresh.payload?.blinkAction, "blink.read_aloud");

assert.equal(
  trimSpeakText("짧음", "긴 제목으로 대체"),
  "긴 제목으로 대체. 짧음"
);

assert.equal(
  shouldAutoTranslatePage("https://www.google.com/maps/place/Paris", "ko"),
  false
);

console.log("✓ read-aloud: legacy translate chips migrate to in-app TTS");
