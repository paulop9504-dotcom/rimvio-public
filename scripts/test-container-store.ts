#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetContainerEventsForTests,
  resetContainerStoreForTests,
  findRelevantContainer,
  isContainerWorthCreating,
  listEventsForContainer,
  listRecentEvents,
  appendContainerEvent,
} from "../lib/container-store";
import { formatContainerContextBlock } from "../lib/container-store/resolve-container-context";
import { resetStreamStoreForTests } from "../lib/data-architect/persist-stream-record";

resetContainerStoreForTests();
resetContainerEventsForTests();
resetStreamStoreForTests();

const typhoonMatch = findRelevantContainer({
  rawInput: "제6호 태풍 장미 북상, 우산 챙겨야 할 듯",
});
assert.ok(typhoonMatch);
assert.equal(typhoonMatch?.id, "news_briefing");

const short = findRelevantContainer({ rawInput: "안녕" });
assert.equal(short, null);

assert.equal(isContainerWorthCreating("안녕"), false);
assert.equal(
  isContainerWorthCreating("포켓몬 TCG 신규 세트 온보딩 프로젝트 일정 잡아줘"),
  true
);

appendContainerEvent({
  container_id: typhoonMatch!.id,
  type: "user_message",
  data: { message: "test" },
});

const events = listEventsForContainer(typhoonMatch!.id);
assert.ok(events.length >= 1);

const block = formatContainerContextBlock(typhoonMatch);
assert.ok(block?.includes("news_briefing") || block?.includes("뉴스"));

assert.ok(listRecentEvents().length >= 1);

console.log("test-container-store: ok");
