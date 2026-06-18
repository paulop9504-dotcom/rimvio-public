export class FetchTimeoutError extends Error {
  readonly code = "fetch_timeout";

  constructor(label: string, timeoutMs: number) {
    super(`${label}_timeout_${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number; timeoutLabel?: string } = {}
) {
  const { timeoutMs = 20_000, timeoutLabel = "fetch", ...rest } = init;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...rest,
      signal: rest.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FetchTimeoutError(timeoutLabel, timeoutMs);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
