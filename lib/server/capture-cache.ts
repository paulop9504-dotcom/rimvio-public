import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { CapturePayload } from "@/lib/screenshot/capture-types";

export type { CapturePayload } from "@/lib/screenshot/capture-types";

const CACHE_DIR = path.join(process.cwd(), ".data", "cache", "capture");
const DEFAULT_TTL_MS = 10 * 60 * 1000;

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

function filePath(token: string) {
  return path.join(CACHE_DIR, `${token}.json`);
}

export async function writeCaptureCache(
  payload: CapturePayload,
  ttlMs = DEFAULT_TTL_MS
) {
  await ensureCacheDir();
  await writeFile(filePath(payload.id), JSON.stringify(payload), "utf8");

  setTimeout(() => {
    void unlink(filePath(payload.id)).catch(() => undefined);
  }, ttlMs).unref?.();
}

export async function readCaptureCache(
  token: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<CapturePayload | null> {
  try {
    const raw = await readFile(filePath(token), "utf8");
    const payload = JSON.parse(raw) as CapturePayload;

    if (!payload?.storedAt || Date.now() - payload.storedAt > ttlMs) {
      await unlink(filePath(token)).catch(() => undefined);
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createCaptureToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
