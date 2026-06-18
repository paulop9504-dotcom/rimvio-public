import assert from "node:assert/strict";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";
import { resolveCaptureSpacetime } from "@/lib/location-ping/resolve-capture-spacetime";
import type { GpsPing } from "@/lib/location-ping/types";

function makePing(
  baseMs: number,
  offsetMinutes: number,
  lat: number,
  lng: number,
): GpsPing {
  const capturedAtIso = new Date(baseMs + offsetMinutes * 60_000).toISOString();
  return {
    id: `ping-${offsetMinutes}`,
    lat,
    lng,
    accuracyM: 12,
    capturedAtIso,
    source: "periodic",
  };
}

async function run() {
  const now = new Date("2026-06-03T12:00:00.000Z");
  const pings = [
    makePing(now.getTime(), -12, 33.4996, 126.5312),
    makePing(now.getTime(), -3, 33.5101, 126.5215),
    makePing(now.getTime(), 2, 37.5665, 126.978),
  ];
  resetGpsPingStoreForTests(pings);

  const file = {
    name: "jeju.jpg",
    type: "image/jpeg",
    lastModified: now.getTime() - 4 * 60_000,
    size: 1024,
  } as File;

  const resolved = await resolveCaptureSpacetime({
    file,
    pings,
    now,
  });

  assert.equal(resolved.resolveSource, "gps_ping");
  assert.equal(resolved.matchedPingId, "ping--3");
  assert.equal(resolved.lat, 33.5101);
  assert.equal(resolved.lng, 126.5215);

  const staleFile = {
    name: "old.jpg",
    type: "image/jpeg",
    lastModified: 0,
    size: 512,
  } as File;

  const fallback = await resolveCaptureSpacetime({
    file: staleFile,
    pings,
    now,
  });

  assert.equal(fallback.resolveSource, "gps_ping");
  assert.equal(fallback.matchedPingId, "ping-2");
  assert.equal(fallback.lat, 37.5665);

  const pastExifBytes = new Uint8Array(256).fill(0x20);
  const exifTail = new TextEncoder().encode(
    "DateTimeOriginal\x002025:01:10 10:00:00",
  );
  const pastBuffer = new Uint8Array(pastExifBytes.length + exifTail.length);
  pastBuffer.set(pastExifBytes, 0);
  pastBuffer.set(exifTail, pastExifBytes.length);

  const pastFile = {
    name: "jeju-past.heic",
    type: "image/heic",
    lastModified: now.getTime(),
    size: pastBuffer.length,
    slice: (start = 0, end = pastBuffer.length) => ({
      arrayBuffer: async () =>
        pastBuffer.slice(start, end).buffer.slice(
          pastBuffer.byteOffset + start,
          pastBuffer.byteOffset + Math.min(end, pastBuffer.length),
        ),
    }),
  } as unknown as File;

  const historical = await resolveCaptureSpacetime({
    file: pastFile,
    pings,
    now,
  });

  assert.equal(historical.resolveSource, "exif_datetime");
  assert.equal(historical.matchedPingId, null);
  assert.equal(historical.lat, null);

  console.log("test-capture-spacetime: ok");
}

void run();
