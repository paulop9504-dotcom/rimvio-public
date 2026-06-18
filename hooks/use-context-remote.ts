"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  resolveContextRemote,
  type ContextRemoteState,
} from "@/lib/remote/resolve-context-remote";
import type { LocateActionResult } from "@/lib/locate/types";
import {
  clipboardTextForRemoteDevPreset,
  readRemoteDevPresetFromSearch,
} from "@/lib/remote/dev-presets";
import {
  CAPTURE_INTENT_UPDATED,
  readCaptureIntent,
  readCaptureVision,
} from "@/lib/capture/capture-intent-session";
import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import type { LinkRow } from "@/types/database";

const CLIPBOARD_STALE_MS = 5 * 60 * 1000;

async function readClipboardText() {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return null;
  }

  try {
    return (await navigator.clipboard.readText()).trim() || null;
  } catch {
    return null;
  }
}

export function useContextRemote(
  activeLink: LinkRow | null,
  options?: {
    locateResult?: LocateActionResult | null;
    locateLoading?: boolean;
  }
) {
  const [devPreset] = useState(() =>
    typeof window === "undefined"
      ? null
      : readRemoteDevPresetFromSearch(window.location.search)
  );
  const [clipboardText, setClipboardText] = useState<string | null>(() =>
    clipboardTextForRemoteDevPreset(devPreset)
  );
  const [clipboardAt, setClipboardAt] = useState(() =>
    devPreset ? Date.now() : 0
  );
  const [captureIntent, setCaptureIntentState] = useState<CaptureIntent | null>(
    () => readCaptureIntent()
  );
  const [captureVision, setCaptureVisionState] = useState<CaptureVisionResult | null>(
    () => readCaptureVision()
  );

  const refreshClipboard = useCallback(async () => {
    if (devPreset) {
      return;
    }

    const text = await readClipboardText();
    if (text) {
      setClipboardText(text);
      setClipboardAt(Date.now());
    }
  }, [devPreset]);

  useEffect(() => {
    void refreshClipboard();

    const onFocus = () => {
      void refreshClipboard();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshClipboard();
      }
    };

    const onCaptureIntentUpdated = () => {
      setCaptureIntentState(readCaptureIntent());
      setCaptureVisionState(readCaptureVision());
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(CAPTURE_INTENT_UPDATED, onCaptureIntentUpdated);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(CAPTURE_INTENT_UPDATED, onCaptureIntentUpdated);
    };
  }, [refreshClipboard]);

  const effectiveClipboard = useMemo(() => {
    if (!clipboardText) {
      return null;
    }

    if (Date.now() - clipboardAt > CLIPBOARD_STALE_MS) {
      return null;
    }

    return clipboardText;
  }, [clipboardAt, clipboardText]);

  const remote = useMemo(
    () =>
      resolveContextRemote({
        clipboardText: effectiveClipboard,
        captureIntent,
        captureVision,
        locateResult: options?.locateResult ?? null,
        locateLoading: options?.locateLoading ?? false,
        link: activeLink,
        hour: new Date().getHours(),
      }),
    [
      activeLink,
      captureIntent,
      captureVision,
      effectiveClipboard,
      options?.locateLoading,
      options?.locateResult,
    ]
  );

  return {
    remote,
    refreshClipboard,
  } satisfies {
    remote: ContextRemoteState;
    refreshClipboard: () => Promise<void>;
  };
}
