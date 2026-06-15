#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestratePlaceConfirm } from "../lib/action-chat/orchestrate-place-confirm";
import { buildLocationSearchQuery } from "../lib/corrections/resolve-location-suggestions";

const query = buildLocationSearchQuery({
  extracted: {
    address: "대전 서구 둔산동",
    phone: null,
    datetime: null,
    place_name: "갤러리아",
    url: null,
  },
  message: "둔산동 갤러리아 예약해줘",
});

assert.match(query, /갤러리아/u);

async function main() {
  const result = await orchestratePlaceConfirm({
    message: "둔산동 갤러리아 예약해줘",
    referenceDate: "2026-05-29",
  });

  assert.ok(result);
  assert.equal(result?.confirmation?.meta.intent, "CONFIRM");
  assert.ok(result?.confirmation?.location_ux);
  assert.notEqual(result?.confirmation?.location_ux?.mode, "classic");
  assert.ok((result?.confirmation?.location_suggestions?.length ?? 0) >= 2);
  assert.ok(result?.thought?.includes("Missing"));

  const station = await orchestratePlaceConfirm({
    message: "3분뒤에 수서역 가야되",
    referenceDate: "2026-05-29",
  });
  assert.ok(station?.confirmation?.location_ux);
  assert.ok(
    station?.confirmation?.location_ux?.mode === "quick_pick" ||
      station?.confirmation?.location_ux?.mode === "inline_pick"
  );

  const chickenRec = await orchestratePlaceConfirm({
    message: "대전 치킨 맛집 추천",
    referenceDate: "2026-05-29",
  });
  assert.equal(chickenRec, null, "recommendation queries must not trigger place confirm");

  console.log("test-orchestrate-place-confirm: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
