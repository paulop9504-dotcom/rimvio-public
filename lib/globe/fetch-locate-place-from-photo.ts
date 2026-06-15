"use client";

import { prepareCaptureImageForUpload } from "@/lib/capture/prepare-capture-image";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import type { LocateActionResult } from "@/lib/locate/types";

const LOCATE_TIMEOUT_MS = 12_000;

export async function fetchLocatePlaceFromPhoto(input: {
  file: File;
  lat: number;
  lng: number;
}): Promise<LocateActionResult | null> {
  if (!input.file.type.startsWith("image/")) {
    return null;
  }

  try {
    const prepared = await prepareCaptureImageForUpload(input.file);
    const form = new FormData();
    form.append("image", prepared);
    form.append("lat", String(input.lat));
    form.append("lng", String(input.lng));

    const response = await fetchWithTimeout("/api/locate", {
      method: "POST",
      body: form,
      timeoutMs: LOCATE_TIMEOUT_MS,
      timeoutLabel: "locate",
    });

    const payload = (await response.json()) as LocateActionResult & {
      error?: string;
    };
    if (!response.ok || !payload.place_name?.trim()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
