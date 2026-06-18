#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildNavSectorOptions,
  defaultNavSectorOrder,
  orderNavSectorOptions,
} from "../lib/navigation/nav-sector";

const destination = {
  placeName: "쿠우쿠우",
  navAddress: "대전 서구 도안동로 10",
  query: "쿠우쿠우 대전 서구 도안동로 10",
  domestic: true,
};

const options = buildNavSectorOptions(destination);
assert.equal(options.length, 6);
assert.ok(options.some((option) => option.id === "tmap"));
assert.ok(options.some((option) => option.id === "kakao-navi"));
assert.match(options.find((option) => option.id === "tmap")!.href, /tmap:\/\//);
assert.doesNotMatch(
  decodeURIComponent(options.find((option) => option.id === "tmap")!.href).replace(/\+/g, " "),
  /4층/
);

const ordered = orderNavSectorOptions(options, true, {
  usage: { tmap: 4, naver: 1 },
  hidden: ["apple"],
  totalOpens: 5,
});
assert.equal(ordered[0]?.id, "tmap");
assert.equal(ordered.some((option) => option.id === "apple"), false);
assert.deepEqual(defaultNavSectorOrder(true).slice(0, 3), ["tmap", "naver", "kakao"]);

console.log("test-nav-sector: ok");
