import assert from "node:assert/strict";
import { toBridgeFetchError } from "../lib/experience-bridge/bridge-fetch-error";

assert.equal(toBridgeFetchError(new Error("Failed to fetch")), null);
assert.equal(
  toBridgeFetchError(new Error("Authentication required.")),
  "로그인이 필요해요",
);
assert.equal(
  toBridgeFetchError(new Error("Forbidden.")),
  "이 경험에 접근할 수 없어요",
);
assert.equal(
  toBridgeFetchError(new Error("bridge_upsert_failed")),
  "잠시 후 다시 시도해 주세요",
);

console.log("test-bridge-fetch-error: ok");
