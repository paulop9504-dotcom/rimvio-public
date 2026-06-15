#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildKakaoShareText, getKakaoJsKey, isKakaoSdkConfigured } from "../lib/share/kakao-share";

const text = buildKakaoShareText({
  title: "무신사 후드",
  original_url: "https://www.musinsa.com/app/goods/1",
  category: "shopping",
  domain: "musinsa.com",
});

assert.match(text, /림비오/);
assert.match(text, /무신사 후드/);
assert.match(text, /musinsa\.com/);

assert.equal(isKakaoSdkConfigured(), Boolean(getKakaoJsKey()));

console.log("test-kakao-share: ok");
