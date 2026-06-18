#!/usr/bin/env npx tsx
import { buildPeerComposerContextBlock } from "../lib/context/build-peer-composer-context";
import { parsePinnedPeerMentions } from "../lib/context/parse-pinned-peer-mention";
import { isReservedPeerMentionToken } from "../lib/context/parse-pinned-peer-mention";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

if (!isReservedPeerMentionToken("캘린더")) {
  fail("calendar_reserved");
}

const mentions = parsePinnedPeerMentions("@지수 안녕 @캘린더 @지수");
if (mentions.length !== 1 || mentions[0] !== "지수") {
  fail(`parse_mentions:${mentions.join(",")}`);
}

const empty = buildPeerComposerContextBlock("안녕");
if (empty.block !== null) {
  fail("no_block_without_mention");
}

if (violations.length > 0) {
  console.error("FAIL pinned-peer-mention");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS pinned-peer-mention");
