#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  foldKernelMemory,
  normalizeMemoryKey,
  orchestrateEventKernel,
  resetKernelMemoryStoreForTests,
  memoryKeysMatch,
} from "../lib/event-kernel";
import { compressStmEvents } from "../lib/event-kernel/memory/compress-stm";
import { emptyKernelMemoryState } from "../lib/event-kernel/memory/types";

resetKernelMemoryStoreForTests();

const history = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const queryKernel = orchestrateEventKernel({
  message: "쿠우쿠우 도안점 정보 알려줘",
  history: [],
});

const first = foldKernelMemory({
  kernel: queryKernel,
  userMessage: "쿠우쿠우 도안점 정보 알려줘",
  previous: emptyKernelMemoryState("2026-05-31T00:00:00.000Z"),
  now: "2026-05-31T00:00:01.000Z",
});

assert.equal(first.output.stm.length, 1);
assert.ok(first.output.wm.some((item) => memoryKeysMatch(item.label, "쿠우쿠우")));
assert.ok(first.state.session_topic);

const priceKernel = orchestrateEventKernel({
  message: "가격은 얼마야?",
  history,
});
const priceFold = foldKernelMemory({
  kernel: priceKernel,
  userMessage: "가격은 얼마야?",
  previous: first.state,
  now: "2026-05-31T00:00:01.500Z",
});
assert.equal(priceFold.output.stm.length, 2);
assert.ok(
  priceFold.state.session_topic === first.state.session_topic ||
    priceFold.output.wm.some((item) => item.kind === "topic")
);

const ackKernel = orchestrateEventKernel({
  message: "응",
  history: [...history, { role: "user", content: "가격은?" }],
});
const second = foldKernelMemory({
  kernel: ackKernel,
  userMessage: "응",
  previous: priceFold.state,
  now: "2026-05-31T00:00:02.000Z",
});

assert.ok(second.output.stm.length >= 2);
assert.ok(second.output.active_links.length >= 1);
assert.equal(second.output.active_links.at(-1)?.relation, "ack");

const closeKernel = orchestrateEventKernel({ message: "고마워", history });
const closed = foldKernelMemory({
  kernel: closeKernel,
  userMessage: "고마워",
  previous: second.state,
  now: "2026-05-31T00:00:03.000Z",
});
assert.equal(closed.state.session_topic, null);
assert.ok(closed.output.stm.length <= 3);

assert.ok(memoryKeysMatch("쿠우쿠우 도안점", "쿠우쿠우"));
assert.equal(normalizeMemoryKey("  쿠우쿠우  "), normalizeMemoryKey("쿠우쿠우"));

let repeated = first.state;
for (let i = 0; i < 4; i += 1) {
  const kernel = orchestrateEventKernel({
    message: "쿠우쿠우 가격",
    history,
  });
  repeated = foldKernelMemory({
    kernel,
    userMessage: "쿠우쿠우 가격",
    previous: repeated,
    now: `2026-05-31T00:00:0${4 + i}.000Z`,
  }).state;
}
assert.ok(repeated.ltm.length >= 1, "repeated entity should promote to LTM");

const manyEvents = Array.from({ length: 12 }, (_, index) => ({
  id: `stm-${index}`,
  at: `2026-05-31T00:00:${String(index).padStart(2, "0")}.000Z`,
  gist: index % 2 === 0 ? "쿠우쿠우 · price" : "other · topic",
  entities: index % 2 === 0 ? ["쿠우쿠우"] : ["other"],
  intent_hint: index % 2 === 0 ? "price" : "topic",
  dominant: "QUERY" as const,
  topic: index % 2 === 0 ? "쿠우쿠우" : "other",
  weight: 1,
}));
const compressed = compressStmEvents(manyEvents);
assert.ok(compressed.length <= 8);
assert.ok(compressed.length >= 3);

assert.deepEqual(Object.keys(first.output).sort(), [
  "active_links",
  "decayed_items",
  "ltm",
  "stm",
  "wm",
]);

console.log("test-kernel-memory: ok");
