import assert from "node:assert/strict";
import {
  cachedFetchJson,
  invalidateCachedFetch,
  resetClientFetchCacheForTests,
} from "../lib/http/client-fetch-cache";

async function main() {
  resetClientFetchCacheForTests();
  let calls = 0;

  const data = await cachedFetchJson(
    "test:key",
    async () => {
      calls += 1;
      return { ok: true };
    },
    5_000,
  );
  assert.equal(data.ok, true);
  assert.equal(calls, 1);

  await cachedFetchJson(
    "test:key",
    async () => {
      calls += 1;
      return { ok: false };
    },
    5_000,
  );
  assert.equal(calls, 1, "cached within TTL");

  invalidateCachedFetch("test:key");
  await cachedFetchJson(
    "test:key",
    async () => {
      calls += 1;
      return { ok: true };
    },
    5_000,
  );
  assert.equal(calls, 2, "refetch after invalidate");

  resetClientFetchCacheForTests();
  await cachedFetchJson(
    "stale:key",
    async () => ({ ok: true, v: 1 }),
    1,
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  const stale = await cachedFetchJson(
    "stale:key",
    async () => {
      throw new Error("network down");
    },
    1,
  );
  assert.equal(stale.v, 1, "stale fallback on fetch error");

  console.log("test-client-fetch-cache: ok");
}

void main();
