#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { routeRimvioCommand, isRimvioCommandToken } from "@/lib/command-router";
import { isDeprecatedCommandToken } from "@/lib/inside-out/slim-command-protocol";

function expect(input: string, expected: string) {
  const out = routeRimvioCommand(input);
  assert.equal(out, expected, `input=${JSON.stringify(input)} got=${JSON.stringify(out)}`);
}

expect("3분 뒤 알람", "@알림 3분");
expect("엄마한테 톡 보내줘", "@톡 엄마");
expect("강남역 가자", "@네비 강남역");
expect("점심 뭐 먹지", "@식사");
expect("비 와?", "@검색 비 와?");

expect("@네비 강남역", "@네비 강남역");
expect("@길찾기 수서역까지", "@길찾기 수서역까지");

expect("랜덤한 말", "@검색 랜덤한 말");
expect("@unknown foo bar", "@검색 unknown foo bar");
expect("@타이머 5분", "@검색 타이머 5분");
expect("@집중 1시간", "@검색 집중 1시간");

expect("택시 불러 강남역", "@택시 강남역");

assert.ok(isRimvioCommandToken("네비"));
assert.ok(!isRimvioCommandToken("foo"));
assert.ok(isDeprecatedCommandToken("타이머"));
assert.ok(isDeprecatedCommandToken("집중"));

const lines = [
  routeRimvioCommand("안녕"),
  routeRimvioCommand("@알림 5분"),
].map((line) => line.split("\n").length);
assert.ok(lines.every((count) => count === 1));

console.log("test-command-router: ok");
