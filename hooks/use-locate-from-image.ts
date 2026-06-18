"use client";

import { useCallback, useState } from "react";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/http/fetch-with-timeout";
import { prepareCaptureImageForUpload } from "@/lib/capture/prepare-capture-image";
import type { LocateActionResult } from "@/lib/locate/types";

const LOCATE_FETCH_TIMEOUT_MS = 12_000;

export type LocateFromImageState = {
  loading: boolean;
  result: LocateActionResult | null;
  error: string | null;
};

export function useLocateFromImage() {
  const [state, setState] = useState<LocateFromImageState>({
    loading: false,
    result: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null });
  }, []);

  const locateFromFile = useCallback(
    async (file: File, options?: { lat?: number; lng?: number }) => {
      if (!file.type.startsWith("image/")) {
        setState({ loading: false, result: null, error: "invalid_image_type" });
        return null;
      }

      setState({ loading: true, result: null, error: null });

      try {
        const prepared = await prepareCaptureImageForUpload(file);
        const formData = new FormData();
        formData.append("image", prepared);

        if (typeof options?.lat === "number" && typeof options?.lng === "number") {
          formData.append("lat", String(options.lat));
          formData.append("lng", String(options.lng));
        }

        const response = await fetchWithTimeout("/api/locate", {
          method: "POST",
          body: formData,
          timeoutMs: LOCATE_FETCH_TIMEOUT_MS,
          timeoutLabel: "locate",
        });

        const payload = (await response.json()) as LocateActionResult & {
          error?: string;
        };

        if (!response.ok) {
          const error = payload.error ?? "locate_failed";
          setState({ loading: false, result: null, error });
          return null;
        }

        setState({ loading: false, result: payload, error: null });
        return payload;
      } catch (error) {
        if (error instanceof FetchTimeoutError) {
          setState({ loading: false, result: null, error: "locate_timeout" });
          return null;
        }
        setState({ loading: false, result: null, error: "locate_failed" });
        return null;
      }
    },
    []
  );

  return {
    ...state,
    locateFromFile,
    reset,
  };
}
