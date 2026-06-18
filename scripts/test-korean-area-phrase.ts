#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveKoreanAreaPhrase } from "../lib/event-commit-gate/resolve-korean-area-phrase";
import { orchestrateSlotCollectContinuation } from "../lib/event-commit-gate/resolve-slot-collect-reply";

async function main() {
  const bare = resolveKoreanAreaPhrase({ message: "대치동" });
  assert.equal(bare.needsBroaderContext, true);

  const withGu = resolveKoreanAreaPhrase({ message: "강남구 대치동" });
  assert.equal(withGu.needsBroaderContext, false);
  assert.match(withGu.searchQuery, /강남구/);
  assert.match(withGu.searchQuery, /대치동/);

  const withLifeZone = resolveKoreanAreaPhrase({
    message: "대치동",
    lifeZoneLabel: "서울 강남구",
  });
  assert.equal(withLifeZone.needsBroaderContext, false);
  assert.match(withLifeZone.searchQuery, /강남구/);

  const history = [
    { role: "user" as const, content: "배고파" },
    {
      role: "assistant" as const,
      content:
        "**지역** 기준이시네요. **어느 동네** 쪽으로 볼까요? 동·역·구 이름만 말해 주세요.",
    },
  ];

  const ambiguous = await orchestrateSlotCollectContinuation({
    message: "대치동",
    history,
  });
  assert.ok(ambiguous);
  assert.ok(ambiguous!.confirmation?.area_disambiguation);
  assert.equal(ambiguous!.confirmation?.location_ux?.mode, "area_disambiguation");
  assert.match(ambiguous!.summary ?? "", /같은 이름|어느/);

  const precise = await orchestrateSlotCollectContinuation({
    message: "강남구 대치동",
    history,
  });
  assert.ok(precise);
  assert.ok(!/같은 이름/u.test(precise!.summary ?? ""));

  console.log("test-korean-area-phrase: ok");
}

void main();
