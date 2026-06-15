import assert from "node:assert/strict";
import { buildRimvioBackerMailtoUrl, RIMVIO_BACKER_EMAIL } from "../lib/globe/rimvio-backer-contact";

assert.equal(RIMVIO_BACKER_EMAIL, "paulop9504@gmail.com");

const support = buildRimvioBackerMailtoUrl({
  kind: "support",
  origin: "https://rimvio.vercel.app/globe",
});
assert.ok(support.startsWith(`mailto:${RIMVIO_BACKER_EMAIL}?`));
assert.ok(decodeURIComponent(support).includes("관심 분야: 지원"));
assert.ok(decodeURIComponent(support).includes("Rimvio 지원·투자 문의"));

const invest = buildRimvioBackerMailtoUrl({
  kind: "invest",
  origin: "https://rimvio.vercel.app/globe",
});
assert.ok(decodeURIComponent(invest).includes("관심 분야: 투자"));

console.log("--- rimvio backer contact ---");
console.log("ok");
