/**
 * In-memory GET dedupe + TTL cache for browser fetchers.
 * Cost: prevents concurrent duplicate Vercel invocations (bridge loop storms).
 */

type CacheRow<T> = {
  expiresAt: number;
  data?: T;
  inflight?: Promise<T>;
};

const store = new Map<string, CacheRow<unknown>>();

export async function cachedFetchJson<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const trimmed = key.trim();
  if (!trimmed) {
    return fetcher();
  }

  const now = Date.now();
  const hit = store.get(trimmed) as CacheRow<T> | undefined;

  if (hit?.inflight) {
    return hit.inflight;
  }

  if (hit?.data !== undefined && hit.expiresAt > now) {
    return hit.data;
  }

  const inflight = fetcher()
    .then((data) => {
      store.set(trimmed, { expiresAt: Date.now() + ttlMs, data });
      return data;
    })
    .catch((error) => {
      const stale = store.get(trimmed) as CacheRow<T> | undefined;
      if (stale?.data !== undefined) {
        store.set(trimmed, {
          expiresAt: Date.now() + Math.max(ttlMs, 30_000),
          data: stale.data,
        });
        return stale.data;
      }
      store.delete(trimmed);
      throw error;
    });

  store.set(trimmed, {
    expiresAt: now + ttlMs,
    inflight,
    data: hit?.data,
  });
  return inflight;
}

export function invalidateCachedFetch(keyOrPrefix: string): void {
  const needle = keyOrPrefix.trim();
  if (!needle) {
    return;
  }
  for (const key of [...store.keys()]) {
    if (key === needle || key.startsWith(needle)) {
      store.delete(key);
    }
  }
}

export function resetClientFetchCacheForTests(): void {
  store.clear();
}
